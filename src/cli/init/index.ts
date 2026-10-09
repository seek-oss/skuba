import { styleText } from 'node:util';
import path from 'path';
import readline from 'readline';
import { inspect } from 'util';

import { log as clackLog, note, outro, taskLog } from '@clack/prompts';
import * as Git from '@skuba-lib/api/git';
import fs from 'fs-extra';

import {
  hasDebugFlag,
  hasHelpFlag,
  hasNonInteractiveFlag,
} from '../../utils/args.js';
import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter, findWorkspaceRoot } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { pathExists } from '../../utils/fs.js';
import { type Logger, createLogger } from '../../utils/logging.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';
import { getConsumerManifest } from '../../utils/manifest.js';
import {
  type PackageManager,
  configForPackageManager,
} from '../../utils/packageManager.js';
import {
  BASE_TEMPLATE_DIR,
  TEMPLATE_CONFIG_FILENAME,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { runOxfmt } from '../adapter/oxfmt.js';
import { patchPnpmWorkspace } from '../lint/internalLints/patchPnpmWorkspace.js';
import { tryPatchRenovateConfig } from '../lint/internalLints/patchRenovateConfig.js';

import { getExistingRepoDefaults } from './existingRepo.js';
import { getConfig } from './getConfig.js';
import { initialiseRepo } from './git.js';
import { logInitHelp } from './help.js';
import { confirmExistingRepo } from './prompts.js';
import { resumeTemplating } from './resumeTemplating.js';
import type { InitConfig, Input } from './types.js';
import {
  type RegisterWorkspaceResult,
  registerWorkspaceProject,
} from './workspace.js';
import { writePackageJson } from './writePackageJson.js';

const ROOT_OWNED_FILES = new Set([
  '.dockerignore',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.prettierignore',
  '.prettierrc.js',
  'eslint.config.js',
  'renovate.json5',
]);

const ROOT_OWNED_DIRECTORIES = ['.github', '.vscode'];

const isInRootOwnedDirectory = (pathname: string) =>
  ROOT_OWNED_DIRECTORIES.includes(pathname.split(path.sep)[0] ?? '');

const isRootOwned = (pathname: string) =>
  ROOT_OWNED_FILES.has(path.basename(pathname)) ||
  isInRootOwnedDirectory(pathname);

const feedLines = (
  readable: NodeJS.ReadableStream | null | undefined,
  onLine: (line: string) => void,
) => {
  if (!readable) {
    return;
  }

  readline.createInterface({ input: readable }).on('line', onLine);
};

const createTaskLogLogger = (
  write: (line: string) => void,
  debug: boolean,
): Logger => {
  const logger = createLogger({ debug });

  const logToTask = (...message: unknown[]) => {
    const line = message.map(String).join(' ').trimEnd();
    if (line.length > 0) {
      write(line);
    }
  };

  return {
    ...logger,
    debug: (...message) => {
      if (debug) {
        logToTask(...message);
      }
    },
    subtle: logToTask,
    err: logToTask,
    newline: () => undefined,
    ok: logToTask,
    plain: logToTask,
    warn: logToTask,
  };
};

const installDependencies = async ({
  debug,
  destinationDir,
  packageManager,
  skubaSlug,
}: {
  debug: boolean;
  destinationDir: string;
  packageManager: PackageManager;
  skubaSlug: string;
}) => {
  const exec = createExec({
    cwd: destinationDir,
    stdio: 'pipe',
    streamStdio: process.stdout.isTTY ? undefined : packageManager,
  });

  const args =
    packageManager === 'pnpm'
      ? (['add', '-D', skubaSlug, '--reporter=append-only'] as const)
      : (['add', '-D', skubaSlug] as const);

  if (!process.stdout.isTTY) {
    // The `-D` shorthand is portable across our package managers.
    await exec(packageManager, ...args);
    return;
  }

  const output = taskLog({
    title: 'Installing dependencies',
    limit: 12,
    retainLog: debug,
  });

  const subprocess = exec(packageManager, ...args);

  const onLine = (line: string) => {
    if (line.length > 0) {
      output.message(line);
    }
  };

  feedLines(subprocess.stdout, onLine);
  feedLines(subprocess.stderr, onLine);

  try {
    await subprocess;
    output.success('Installed dependencies');
  } catch (err) {
    output.error('Failed to install dependencies', { showLog: true });
    throw err;
  }
};

const formatProject = async ({
  debug,
  destinationDir,
}: {
  debug: boolean;
  destinationDir: string;
}) => {
  // Templating can initially leave certain files in an unformatted state;
  // consider a Markdown table with columns sized based on content length.
  if (!process.stdout.isTTY) {
    await runOxfmt('format', createLogger({ debug }), [destinationDir]);
    return;
  }

  const output = taskLog({
    title: 'Formatting project',
    limit: 12,
    retainLog: debug,
  });

  try {
    await runOxfmt(
      'format',
      createTaskLogLogger((line) => output.message(line), debug),
      [destinationDir],
    );
    output.success('Formatted project');
  } catch (err) {
    output.error('Failed to format project', { showLog: true });
    throw err;
  }
};

interface InitContext {
  debug: boolean;
  skubaVersion: string;
}

const toSkubaSlug = (skubaVersion: string) => `skuba@${skubaVersion}`;

const resolveWorkspaceRoot = async ({
  cwd,
  nonInteractive,
}: {
  cwd: string;
  nonInteractive: boolean;
}): Promise<string | null> => {
  // Non-interactive runs cannot confirm the workspace, so they always scaffold
  // a new repository.
  if (nonInteractive) {
    return null;
  }

  const workspaceRoot = await findWorkspaceRoot(cwd);

  if (
    !workspaceRoot ||
    !(await pathExists(path.join(workspaceRoot, 'pnpm-workspace.yaml')))
  ) {
    return null;
  }

  return (await confirmExistingRepo(workspaceRoot)) ? workspaceRoot : null;
};

const scaffoldProject = async ({
  config,
  excludeRootOwned,
  skubaVersion,
}: {
  config: InitConfig;
  excludeRootOwned: boolean;
  skubaVersion: string;
}) => {
  const {
    destinationDir,
    entryPoint,
    packageManager,
    templateComplete,
    templateData,
    templateName,
    type,
  } = config;

  await ensureCommands(packageManager);

  if (excludeRootOwned) {
    // The selected template may have shipped its own copies.
    await Promise.all(
      [...ROOT_OWNED_DIRECTORIES, ...ROOT_OWNED_FILES].map(async (name) => {
        await fs.remove(path.join(destinationDir, name));
      }),
    );
  }

  const include = await createInclusionFilter([
    path.join(destinationDir, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  const processors = [createEjsRenderer(templateData)];

  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
    destinationRoot: destinationDir,
    include: (pathname) =>
      include(pathname) && !(excludeRootOwned && isRootOwned(pathname)),
    // prefer template-specific files
    overwrite: false,
    processors,
    // base template has files like _eslint.config.js
    stripUnderscorePrefix: true,
  });

  await copyFiles({
    sourceRoot: destinationDir,
    destinationRoot: destinationDir,
    include,
    processors,
  });

  await Promise.all([
    templateComplete
      ? ensureTemplateConfigDeletion(destinationDir)
      : Promise.resolve(),

    writePackageJson({
      cwd: destinationDir,
      entryPoint,
      template: templateName,
      type,
      version: skubaVersion,
    }),
  ]);
};

const installFormatAndCommit = async ({
  config: { destinationDir, packageManager, templateName },
  debug,
  skubaSlug,
}: {
  config: InitConfig;
  debug: boolean;
  skubaSlug: string;
}): Promise<{ depsInstalled: boolean }> => {
  let depsInstalled = false;
  try {
    await installDependencies({
      debug,
      destinationDir,
      packageManager,
      skubaSlug,
    });

    await formatProject({
      debug,
      destinationDir,
    });

    depsInstalled = true;
  } catch (err) {
    clackLog.warn(inspect(err));
  }

  const gitRoot = await Git.findRoot({ dir: path.resolve(destinationDir) });
  if (gitRoot) {
    await Git.commitAllChanges({
      dir: path.resolve(destinationDir),
      message: `Clone ${templateName}`,
    });
  } else {
    clackLog.warn(
      `Skipped initial commit: no Git repository found at or above ${styleText(
        'cyan',
        destinationDir,
      )}`,
    );
  }

  return { depsInstalled };
};

const resumeInitialisationLines = ({
  config: { destinationDir, packageManager },
  skubaSlug,
}: {
  config: InitConfig;
  skubaSlug: string;
}) => [
  styleText('cyan', `cd ${destinationDir}`),
  styleText('cyan', `${packageManager} add -D ${skubaSlug}`),
  styleText('cyan', `${packageManager} run format`),
  styleText('cyan', 'git add --all'),
  styleText('cyan', `git commit --message 'Pin ${skubaSlug}'`),
];

const initNewRepo = async ({
  debug,
  nonInteractive,
  skubaVersion,
}: InitContext & { nonInteractive: boolean }) => {
  const config = await getConfig({ nonInteractive });
  const { destinationDir, packageManager, templateData } = config;
  const skubaSlug = toSkubaSlug(skubaVersion);

  await scaffoldProject({ config, excludeRootOwned: false, skubaVersion });

  await initialiseRepo(destinationDir, templateData);

  const manifest = await getConsumerManifest(destinationDir);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
  }

  if (packageManager === 'pnpm') {
    await fs.promises.writeFile(
      path.join(destinationDir, 'pnpm-workspace.yaml'),
      '',
      'utf8',
    );
    await patchPnpmWorkspace('format', destinationDir);
  }

  // Patch in a baseline Renovate preset based on the configured Git owner.
  await tryPatchRenovateConfig({
    mode: 'format',
    dir: destinationDir,
    manifest,
    packageManager: configForPackageManager(packageManager),
  });

  const { depsInstalled } = await installFormatAndCommit({
    config,
    debug,
    skubaSlug,
  });

  const repoSlug = `${templateData.orgName}/${templateData.repoName}`;
  const newRepoUrl = `https://github.com/new?${new URLSearchParams({
    owner: templateData.orgName,
    name: templateData.repoName,
  }).toString()}`;

  const gitHubRepoCreationLines = [
    `${styleText('dim', 'Create an empty')} ${styleText(
      'cyan',
      repoSlug,
    )} ${styleText('dim', 'repository:')}`,
    styleText(['underline', 'cyan'], newRepoUrl),
    '',
  ];

  const pushLine = styleText(
    'cyan',
    `git push --set-upstream origin ${templateData.defaultBranch}`,
  );

  if (!depsInstalled) {
    clackLog.error('Failed to install dependencies.');

    note(
      [
        ...gitHubRepoCreationLines,
        styleText('dim', 'Then, resume initialisation:'),
        ...resumeInitialisationLines({ config, skubaSlug }),
        pushLine,
      ].join('\n'),
      'Next steps',
    );

    process.exitCode = 1;
    return;
  }

  note(
    [
      ...gitHubRepoCreationLines,
      styleText('dim', 'Then, push your local changes:'),
      styleText('cyan', `cd ${destinationDir}`),
      pushLine,
    ].join('\n'),
    'Next steps',
  );

  outro('Project initialised!');
};

const logWorkspaceRegistration = (registration: RegisterWorkspaceResult) => {
  switch (registration.outcome) {
    case 'already-covered':
      return;

    case 'registered':
      clackLog.success(
        `Registered ${styleText(
          'cyan',
          registration.entry,
        )} in ${styleText('cyan', path.basename(registration.file))}`,
      );
      return;

    case 'manual':
      clackLog.warn(
        [
          `Could not register the project automatically (${registration.reason}).`,
          `Add ${styleText(
            'cyan',
            registration.entry,
          )} to your workspace configuration manually.`,
        ].join('\n'),
      );
      return;
  }
};

const initWorkspaceProject = async ({
  debug,
  skubaVersion,
  workspaceRoot,
}: InitContext & { workspaceRoot: string }) => {
  const config = await getConfig({
    existingRepo: await getExistingRepoDefaults({ workspaceRoot }),
    // Workspace detection is only performed for interactive runs.
    nonInteractive: false,
  });
  const { destinationDir, packageManager } = config;
  const skubaSlug = toSkubaSlug(skubaVersion);

  await scaffoldProject({ config, excludeRootOwned: true, skubaVersion });

  const manifest = await getConsumerManifest(destinationDir);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
  }

  // The root owns `pnpm-workspace.yaml` and Renovate config; only pnpm
  // workspaces are supported, and a non-pnpm root yields a `manual` result
  // rather than a crash.
  const registration = await registerWorkspaceProject({
    workspaceRoot,
    projectDir: path.resolve(destinationDir),
  });

  const { depsInstalled } = await installFormatAndCommit({
    config,
    debug,
    skubaSlug,
  });

  if (!depsInstalled) {
    clackLog.error('Failed to install dependencies.');

    logWorkspaceRegistration(registration);

    note(
      [
        styleText('dim', 'Resume initialisation:'),
        ...resumeInitialisationLines({ config, skubaSlug }),
      ].join('\n'),
      'Next steps',
    );

    process.exitCode = 1;
    return;
  }

  logWorkspaceRegistration(registration);

  // The initial commit only captures the new project's files; the root
  // manifest and lockfile changes are left for the user to review and commit.
  note(
    [
      styleText(
        'dim',
        'The workspace root has uncommitted changes (updated lockfile and workspace config).',
      ),
      styleText('dim', 'Review and commit them alongside the new project.'),
      '',
      styleText('dim', 'Your new project is ready:'),
      styleText('cyan', `cd ${destinationDir}`),
      styleText('cyan', `${packageManager} run lint`),
    ].join('\n'),
    'Next steps',
  );

  outro('Project initialised!');
};

export const init = async (args = process.argv.slice(2)) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
  };

  // Force reading from stdin when `--non-interactive` is passed, otherwise fall
  // back to whether stdin is a TTY.
  const nonInteractive = hasNonInteractiveFlag(args) || !process.stdin.isTTY;

  const skubaVersionInfo = await showLogoAndVersionInfo();

  if (hasHelpFlag(args)) {
    logInitHelp();
    return;
  }

  const consumerManifest = await getConsumerManifest();
  if (
    consumerManifest &&
    (await pathExists(
      path.join(path.dirname(consumerManifest.path), TEMPLATE_CONFIG_FILENAME),
    ))
  ) {
    await resumeTemplating({ manifest: consumerManifest, nonInteractive });
    return;
  }

  const context: InitContext = {
    debug: opts.debug,
    skubaVersion: skubaVersionInfo.local,
  };

  const workspaceRoot = await resolveWorkspaceRoot({
    cwd: process.cwd(),
    nonInteractive,
  });

  return workspaceRoot
    ? initWorkspaceProject({ ...context, workspaceRoot })
    : initNewRepo({ ...context, nonInteractive });
};
