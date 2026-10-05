import path from 'path';
import { inspect } from 'util';

import { type SgNode, parseAsync } from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const GLOB_IGNORE = [
  '**/.git',
  '**/node_modules',
  // Lockfiles list transitive dependencies that the service may never load
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
];

/**
 * Files that may register shutdown handling, preload `tracing.js`, or pull in
 * libraries that buffer data.
 */
const SCANNED_FILE_GLOBS = [
  '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}',
  '**/Dockerfile*',
  '**/*.Dockerfile',
  '**/*.{json,yml,yaml,sh,env}',
  '**/.env*',
];

/**
 * How a service initialises tracing:
 *
 * - `opentelemetry`: `src/tracing.ts` starts the OpenTelemetry `NodeSDK` and is
 *   preloaded by the Dockerfile.
 * - `dd-trace`: `src/register.ts` initialises `dd-trace` and is the first
 *   import of `src/listen.ts`.
 */
type Variant = 'opentelemetry' | 'dd-trace';

/**
 * Markers of anything the patch does not account for. Any match anywhere in
 * the repository skips the patch so the consumer can align their shutdown
 * handling manually.
 */
const BLOCKING_MARKERS: Array<{
  pattern: RegExp;
  reason: string;
  allowedInTracing?: true;
  /** Ignore this marker when every service uses this variant. */
  allowedFor?: Variant;
  /** Only apply this marker when any service uses this variant. */
  onlyFor?: Variant;
}> = [
  {
    // A second handler would race with ours. The template's `src/tracing.ts`
    // handler is the one we replace.
    pattern: /SIGTERM/,
    reason: 'may already handle SIGTERM',
    allowedInTracing: true,
  },
  {
    // Registered its own SIGTERM handler before 0.4.0
    pattern: /@seek\/otel-tracing/,
    reason: 'uses @seek/otel-tracing',
  },
  {
    // Only flushes buffered spans on `beforeExit`, which `process.exit()` skips.
    // The `dd-trace` variant's handler lets the process exit on its own.
    pattern: /dd-trace/,
    reason: 'uses dd-trace',
    allowedFor: 'dd-trace',
  },
  {
    // The `dd-trace` variant's handler waits out the default flush interval
    pattern: /\b(?:flushInterval|DD_TRACE_FLUSH_INTERVAL)\b/,
    reason: 'may customise the dd-trace flush interval',
    onlyFor: 'dd-trace',
  },
  {
    pattern: /launchdarkly/i,
    reason: 'uses LaunchDarkly',
  },
  {
    pattern: /\bdatadog-metrics\b/,
    reason: 'uses datadog-metrics',
  },
  {
    pattern: /\b(?:maxBufferSize|bufferFlushInterval)\b/,
    reason: 'may buffer StatsD metrics',
  },
];

/**
 * A path-like reference to the `tracing` module, e.g. `./lib/tracing.js` in a
 * Dockerfile or `'./tracing.js'` in an import.
 */
const TRACING_REFERENCE = /\/tracing(?:\.[cm]?[jt]s)?(?=['"`\s,\]]|$)/gm;

/**
 * The code of `src/listen.ts` from any version of the `koa-rest-api` template,
 * after comments are removed and the code is normalised by `normaliseCode`.
 *
 * Only identifiers and import styles that varied between template versions are
 * allowed to vary here; any other change skips the patch.
 */
const TEMPLATE_LISTEN_CODE = new RegExp(
  [
    String.raw`^(?<register>import'\./register(?:\.js)?';)?`,
    String.raw`import(?: app |\{app\})from'\./app(?<ext>\.js)?';`,
    String.raw`(?:import\{config\}from'\./config\k<ext>';)?`,
    String.raw`import\{(?<logger>[A-Za-z_$][\w$]*)\}from'\./framework/logging\k<ext>';`,
    String.raw`const listener=app\.listen\((?:app|config)\.port,\(\)=>\{`,
    String.raw`const address=listener\.address\(\);`,
    String.raw`if\(typeof address==='object'&&address\)\{`,
    String.raw`\k<logger>\.debug\(\`listening on port \$\{address\.port\}\`\);`,
    String.raw`\}\}\);`,
    String.raw`(?:listener\.keepAliveTimeout=31000;)?`,
    String.raw`(?:process\.on\('unhandledRejection',\(err\)=>\k<logger>\.error\(err,'Unhandled promise rejection'\)\);)?$`,
  ].join(''),
);

const sigtermHandler = (logger: string) => `
// We have 30 seconds after receiving our SIGTERM before we will be SIGKILLed.
// Node.js runs as PID 1 in the distroless runtime image and would otherwise
// ignore SIGTERM entirely, causing the shutdown to stall for 30 seconds.
process.on('SIGTERM', () => {
  ${logger}.info('received SIGTERM, draining connections');

  // Fall back to a hard exit just before the SIGKILL if draining stalls.
  // eslint-disable-next-line no-process-exit
  setTimeout(() => process.exit(1), 25_000).unref();

  // Stop accepting connections, drain in-flight requests, and flush spans.
  promisify(listener.close.bind(listener))()
    .then(() => sdk?.shutdown())
    .catch((err: unknown) => ${logger}.error(err, 'failed to drain cleanly'))
    .finally(() => process.exit(0)); // eslint-disable-line no-process-exit
});`;

/**
 * dd-trace has no public API to flush spans. It flushes them on an interval
 * and on `beforeExit`, which `process.exit()` skips, so this handler lets the
 * process exit on its own once the server has closed.
 */
const ddTraceSigtermHandler = (logger: string) => `
// We have 30 seconds after receiving our SIGTERM before we will be SIGKILLed.
// Node.js runs as PID 1 in the distroless runtime image and would otherwise
// ignore SIGTERM entirely, causing the shutdown to stall for 30 seconds.
process.on('SIGTERM', () => {
  ${logger}.info('received SIGTERM, draining connections');

  // Fall back to a hard exit just before the SIGKILL if draining stalls.
  // eslint-disable-next-line no-process-exit
  setTimeout(() => process.exit(1), 25_000).unref();

  // Stop accepting connections and drain in-flight requests.
  listener.close((err) => {
    if (err) {
      ${logger}.error(err, 'failed to drain cleanly');
    }

    // Let the process exit on its own so dd-trace flushes spans on \`beforeExit\`,
    // which \`process.exit()\` skips. If another handle keeps the process alive,
    // exit once dd-trace's periodic flush (every 2 seconds by default) has sent
    // the remaining spans.
    // eslint-disable-next-line no-process-exit
    setTimeout(() => process.exit(0), 5_000).unref();
  });
});`;

/**
 * Comment-only replacements in `src/tracing.ts` that keep its documentation
 * accurate. These are applied when present but are not required.
 */
const OPTIONAL_TRACING_REPLACEMENTS: Array<[string, string]> = [
  [
    `/**
 * OpenTelemetry tracing initialisation. This is a standalone TS/JS module that is not
 * referenced by application source code directly. It is required at runtime using the
 * node command's \`--require\` argument, see Dockerfile for details.
 */
`,
    `/**
 * OpenTelemetry tracing initialisation. This module is preloaded before the
 * application code using the node command's \`--require\` or \`--import\`
 * argument, see Dockerfile for details. \`listen.ts\` imports the started \`sdk\`
 * to flush spans when the process is terminated.
 */
`,
  ],
];

/**
 * Code replacements in `src/tracing.ts` that remove its SIGTERM handler and
 * export the started SDK for `src/listen.ts` to shut down. Every one of these
 * must match exactly once.
 */
const REQUIRED_TRACING_REPLACEMENTS: Array<[string, string]> = [
  ['\nconst main = () => {\n', '\nconst main = (): NodeSDK => {\n'],
  ['\n  const sdk = new NodeSDK({\n', '\n  const nodeSdk = new NodeSDK({\n'],
  [
    `
  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => log('info', 'OpenTelemetry successfully terminated'))
      .catch((err: Error) =>
        log('error', 'OpenTelemetry failed to terminate', { err }),
      )
      .finally(() => process.exit(0)); // eslint-disable-line no-process-exit
  });
};
`,
    `
  nodeSdk.start();

  return nodeSdk;
};
`,
  ],
  [
    `
if (process.env.OPENTELEMETRY_ENABLED === 'true') {
  main();
} else {
  log('info', 'OpenTelemetry not enabled');
}
`,
    `
// The SIGTERM handler in \`listen.ts\` shuts this down.
export const sdk =
  process.env.OPENTELEMETRY_ENABLED === 'true' ? main() : undefined;

if (!sdk) {
  log('info', 'OpenTelemetry not enabled');
}
`,
  ],
];

/**
 * The template's Dockerfile preloads `tracing.js` before `listen.js`. This
 * guarantees that importing `sdk` from `listen.ts` reuses the running SDK
 * rather than starting OpenTelemetry for the first time.
 */
const DOCKERFILE_CMD_PATTERN =
  /"--(?<flag>require|import)",\s*"\.\/lib\/tracing\.js",\s*"\.\/lib\/listen\.js"\s*\]/;

const readFileIfExists = async (file: string): Promise<string | undefined> => {
  try {
    return await fs.promises.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw err;
  }
};

const normaliseLineEndings = (contents: string) =>
  contents.replace(/\r\n/g, '\n');

const restoreLineEndings = (original: string, contents: string) =>
  original.includes('\r\n') ? contents.replace(/\n/g, '\r\n') : contents;

const countOccurrences = (contents: string, search: string) =>
  contents.split(search).length - 1;

const replaceOnce = (
  contents: string,
  search: string,
  replacement: string,
): string | undefined =>
  countOccurrences(contents, search) === 1
    ? contents.replace(search, () => replacement)
    : undefined;

/**
 * `src/register.ts` imports `dd-trace` by its default export and initialises
 * it exactly once.
 */
const isDdTraceRegister = (contents: string | undefined): boolean => {
  if (contents === undefined) {
    return false;
  }

  const tracer = /^import (?<tracer>[A-Za-z_$][\w$]*) from 'dd-trace';$/m.exec(
    normaliseLineEndings(contents),
  )?.groups?.tracer;

  return (
    tracer !== undefined && countOccurrences(contents, `${tracer}.init(`) === 1
  );
};

/**
 * Reduces code to a canonical form so that formatting differences such as
 * line wrapping and trailing commas do not affect matching.
 */
const normaliseCode = (code: string) =>
  code
    .replace(/\s+/g, ' ')
    .replace(/ ?([^\w$ ]) ?/g, '$1')
    .replace(/,([)\]}])/g, '$1')
    .trim();

const stripComments = (ast: SgNode) =>
  ast.commitEdits(
    ast
      .findAll({ rule: { kind: 'comment' } })
      .map((comment) => comment.replace(' ')),
  );

const matchListen = async (contents: string) => {
  const ast = (await parseAsync('TypeScript', contents)).root();

  const match = TEMPLATE_LISTEN_CODE.exec(normaliseCode(stripComments(ast)));

  const logger = match?.groups?.logger;

  if (!logger) {
    return undefined;
  }

  return {
    ast,
    logger,
    ext: match.groups?.ext ?? '',
    importsRegister: match.groups?.register !== undefined,
  };
};

export const patchListen = async (
  rawContents: string,
  variant: Variant = 'opentelemetry',
): Promise<string | undefined> => {
  const contents = normaliseLineEndings(rawContents);

  const match = await matchListen(contents);

  // dd-trace must be initialised by `src/register.ts` before anything else
  if (!match || (variant === 'dd-trace' && !match.importsRegister)) {
    return undefined;
  }

  const { ast, logger, ext } = match;

  const statements = ast.children().filter((node) => node.kind() !== 'comment');

  const imports = statements.filter(
    (node) => node.kind() === 'import_statement',
  );

  const firstBindingImport = imports.find((node) =>
    node.children().some((child) => child.kind() === 'import_clause'),
  );
  const lastImport = imports.at(-1);

  const listenerIndex = statements.findIndex(
    (node) => node.kind() === 'lexical_declaration',
  );
  const listener = statements[listenerIndex];
  const nextStatement = statements[listenerIndex + 1];

  const keepAlive =
    nextStatement &&
    normaliseCode(stripComments(nextStatement)).startsWith(
      'listener.keepAliveTimeout=',
    )
      ? nextStatement
      : undefined;

  const handlerAnchor = keepAlive ?? listener;

  if (!firstBindingImport || !lastImport || !handlerAnchor) {
    return undefined;
  }

  // Each insertion goes before this 0-based line index
  const insertions: Array<{ line: number; lines: string[] }> =
    variant === 'dd-trace'
      ? [
          {
            line: handlerAnchor.range().end.line + 1,
            lines: ddTraceSigtermHandler(logger).split('\n'),
          },
        ]
      : [
          {
            line: firstBindingImport.range().start.line,
            lines: ["import { promisify } from 'node:util';", ''],
          },
          {
            line: lastImport.range().end.line + 1,
            lines: [`import { sdk } from './tracing${ext}';`],
          },
          {
            line: handlerAnchor.range().end.line + 1,
            lines: sigtermHandler(logger).split('\n'),
          },
        ];

  const comments = ast.findAll({ rule: { kind: 'comment' } });

  // Inserting lines must not split a multi-line comment
  if (
    insertions.some(({ line }) =>
      comments.some(
        (comment) =>
          comment.range().start.line < line && comment.range().end.line >= line,
      ),
    )
  ) {
    return undefined;
  }

  const lines = contents.split('\n');

  for (const insertion of insertions.sort((a, b) => b.line - a.line)) {
    lines.splice(insertion.line, 0, ...insertion.lines);
  }

  return lines.join('\n');
};

const countIdentifierReferences = (ast: SgNode, name: string): number =>
  ast.findAll({
    rule: {
      any: [
        { kind: 'identifier' },
        { kind: 'shorthand_property_identifier' },
        { kind: 'shorthand_property_identifier_pattern' },
      ],
      regex: `^${name}$`,
    },
  }).length;

export const patchTracing = async (
  rawContents: string,
): Promise<string | undefined> => {
  const contents = normaliseLineEndings(rawContents);

  if (
    // The only SIGTERM reference must be the handler we are replacing
    countOccurrences(contents, 'SIGTERM') !== 1 ||
    contents.includes('nodeSdk') ||
    !/^import \{[^}]*\bNodeSDK\b[^}]*\} from '@opentelemetry\/sdk-node';$/m.test(
      contents,
    )
  ) {
    return undefined;
  }

  const ast = (await parseAsync('TypeScript', contents)).root();

  // `sdk` must only be referenced within the replaced snippets: its
  // declaration, `sdk.start()` and `sdk.shutdown()`. `main` must only be
  // declared and called once, so the exported `sdk` is the only instance.
  if (
    countIdentifierReferences(ast, 'sdk') !== 3 ||
    countIdentifierReferences(ast, 'main') !== 2
  ) {
    return undefined;
  }

  let patched = contents;

  for (const [search, replacement] of OPTIONAL_TRACING_REPLACEMENTS) {
    const occurrences = countOccurrences(patched, search);

    if (occurrences > 1) {
      return undefined;
    }

    if (occurrences === 1) {
      patched = patched.replace(search, () => replacement);
    }
  }

  for (const [search, replacement] of REQUIRED_TRACING_REPLACEMENTS) {
    const next = replaceOnce(patched, search, replacement);

    if (next === undefined) {
      return undefined;
    }

    patched = next;
  }

  return patched;
};

type FileUpdate = { file: string; contents: string };

type Candidate =
  | {
      variant: 'opentelemetry';
      listenFile: string;
      patchedListen: string;
      tracingFile: string;
      packageDir: string;
      dockerfile: string;
    }
  | {
      variant: 'dd-trace';
      listenFile: string;
      patchedListen: string;
    };

const isModulePackage = async (
  packageJson: string,
): Promise<boolean | undefined> => {
  const contents = await readFileIfExists(packageJson);

  if (contents === undefined) {
    return undefined;
  }

  try {
    return (JSON.parse(contents) as { type?: unknown }).type === 'module';
  } catch {
    return undefined;
  }
};

const evaluateCandidate = async (
  root: string,
  candidate: Candidate,
): Promise<
  { ok: true; updates: FileUpdate[] } | { ok: false; reason: string }
> => {
  if (candidate.variant === 'dd-trace') {
    // `src/register.ts` was checked when the candidate was found and needs no
    // changes. The repository-wide scan accounts for anything else.
    return {
      ok: true,
      updates: [
        { file: candidate.listenFile, contents: candidate.patchedListen },
      ],
    };
  }

  const { listenFile, patchedListen, tracingFile, packageDir, dockerfile } =
    candidate;

  const tracingContents = await readFileIfExists(tracingFile);

  if (tracingContents === undefined) {
    return {
      ok: false,
      reason: `${path.relative(root, tracingFile)} not found`,
    };
  }

  const patchedTracing = await patchTracing(tracingContents);

  if (patchedTracing === undefined) {
    return {
      ok: false,
      reason: `${path.relative(root, tracingFile)} has been customised`,
    };
  }

  const dockerfileContents = await readFileIfExists(dockerfile);

  const flag = dockerfileContents
    ? DOCKERFILE_CMD_PATTERN.exec(dockerfileContents)?.groups?.flag
    : undefined;

  if (!flag) {
    return {
      ok: false,
      reason: `${path.relative(root, dockerfile)} does not preload lib/tracing.js before lib/listen.js`,
    };
  }

  const packageJson = path.join(packageDir, 'package.json');
  const isModule = await isModulePackage(packageJson);

  if (isModule === undefined) {
    return {
      ok: false,
      reason: `${path.relative(root, packageJson)} not found or invalid`,
    };
  }

  // `listen.ts` must load the same `tracing.js` instance that was preloaded:
  // ES modules with `--import`, CommonJS modules with `--require`.
  if ((isModule ? 'import' : 'require') !== flag) {
    return {
      ok: false,
      reason: `${path.relative(root, dockerfile)} preloads lib/tracing.js with --${flag}, which does not match the module type in ${path.relative(root, packageJson)}`,
    };
  }

  return {
    ok: true,
    updates: [
      { file: listenFile, contents: patchedListen },
      {
        file: tracingFile,
        contents: restoreLineEndings(tracingContents, patchedTracing),
      },
    ],
  };
};

const findBlockingFile = async ({
  root,
  gitRoot,
  candidates,
}: {
  root: string;
  gitRoot: string | null;
  candidates: Candidate[];
}): Promise<string | undefined> => {
  const openTelemetryCandidates = candidates.flatMap((candidate) =>
    candidate.variant === 'opentelemetry' ? [candidate] : [],
  );

  const tracingFiles = new Set(
    openTelemetryCandidates.map(({ tracingFile }) => tracingFile),
  );
  const dockerfiles = new Set(
    openTelemetryCandidates.map(({ dockerfile }) => dockerfile),
  );

  const markers = BLOCKING_MARKERS.filter(
    ({ allowedFor, onlyFor }) =>
      (!allowedFor ||
        candidates.some(({ variant }) => variant !== allowedFor)) &&
      (!onlyFor || candidates.some(({ variant }) => variant === onlyFor)),
  );

  const files = await fg(SCANNED_FILE_GLOBS, {
    cwd: root,
    dot: true,
    ignore: GLOB_IGNORE,
  });

  for (const relativePath of files.sort()) {
    const file = path.join(root, relativePath);
    const contents = await fs.promises.readFile(file, 'utf8');

    const isTracingFile = tracingFiles.has(file);

    const marker = markers.find(
      ({ pattern, allowedInTracing }) =>
        !(isTracingFile && allowedInTracing) && pattern.test(contents),
    );

    // Each candidate's Dockerfile CMD is expected to preload `tracing.js`.
    // Any other reference may be another entry point that relies on the
    // SIGTERM handler we are moving out of `src/tracing.ts`.
    const unexpectedTracingReferences = isTracingFile
      ? 0
      : (contents.match(TRACING_REFERENCE)?.length ?? 0) -
        (dockerfiles.has(file) ? 1 : 0);

    const reason =
      marker?.reason ??
      (unexpectedTracingReferences > 0 ? 'references tracing.js' : undefined);

    if (!reason) {
      continue;
    }

    // Ignore build output such as a stale `lib/tracing.js`
    if (
      gitRoot &&
      (await Git.isFileGitIgnored({ absolutePath: file, gitRoot }))
    ) {
      continue;
    }

    return `${relativePath} ${reason}`;
  }

  return undefined;
};

export const patchAutomatSigtermHandler: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const listenFiles = await fg('**/src/listen.ts', {
    cwd: root,
    ignore: GLOB_IGNORE,
  });

  const candidates: Candidate[] = [];

  for (const relativePath of listenFiles.sort()) {
    const listenFile = path.join(root, relativePath);
    const contents = await fs.promises.readFile(listenFile, 'utf8');

    const match = await matchListen(normaliseLineEndings(contents));

    if (!match) {
      continue;
    }

    const srcDir = path.dirname(listenFile);
    const packageDir = path.dirname(srcDir);

    const variant: Variant =
      match.importsRegister &&
      isDdTraceRegister(
        await readFileIfExists(path.join(srcDir, 'register.ts')),
      )
        ? 'dd-trace'
        : 'opentelemetry';

    const patchedListen = await patchListen(contents, variant);

    if (patchedListen === undefined) {
      continue;
    }

    if (variant === 'dd-trace') {
      candidates.push({
        variant,
        listenFile,
        patchedListen: restoreLineEndings(contents, patchedListen),
      });
      continue;
    }

    candidates.push({
      variant,
      listenFile,
      patchedListen: restoreLineEndings(contents, patchedListen),
      tracingFile: path.join(srcDir, 'tracing.ts'),
      packageDir,
      dockerfile: path.join(packageDir, 'Dockerfile'),
    });
  }

  if (candidates.length === 0) {
    return {
      result: 'skip',
      reason: 'no unmodified koa-rest-api src/listen.ts found',
    };
  }

  const updates: FileUpdate[] = [];

  for (const candidate of candidates) {
    const evaluation = await evaluateCandidate(root, candidate);

    if (!evaluation.ok) {
      return { result: 'skip', reason: evaluation.reason };
    }

    updates.push(...evaluation.updates);
  }

  const blockingFile = await findBlockingFile({ root, gitRoot, candidates });

  if (blockingFile) {
    return { result: 'skip', reason: blockingFile };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    updates.map(({ file, contents }) =>
      fs.promises.writeFile(file, contents, 'utf8'),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchAutomatSigtermHandler: PatchFunction = async (config) => {
  try {
    return await patchAutomatSigtermHandler(config);
  } catch (err) {
    log.warn('Failed to add a SIGTERM handler to src/listen.ts');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
