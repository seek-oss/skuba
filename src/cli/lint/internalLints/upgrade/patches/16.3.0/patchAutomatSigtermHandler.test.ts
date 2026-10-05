import * as Git from '@skuba-lib/api/git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { vol } from '../../../../../../testing/memfs.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  patchAutomatSigtermHandler,
  patchListen,
  patchTracing,
} from './patchAutomatSigtermHandler.js';

// Load memfs lazily so these hoisted factories don't depend on import order
vi.mock('fs-extra', async () => {
  const { default: memfs } = await import('../../../../../../testing/memfs.js');
  return { default: memfs, ...memfs };
});
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const { default: memfs } =
      await import('../../../../../../testing/memfs.js');
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
  isFileGitIgnored: vi.fn(),
}));

const findRoot = vi.mocked(Git.findRoot);
const isFileGitIgnored = vi.mocked(Git.isFileGitIgnored);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  packageManager: configForPackageManager('pnpm'),
  mode: 'format',
};

const OLD_LISTEN = `import { app } from './app.js';
import { config } from './config.js';
import { logger } from './framework/logging.js';

// This implements a minimal version of \`koa-cluster\`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use \`koa-cluster\` to run \`lib/app\`.

const listener = app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    logger.debug(\`listening on port \${address.port}\`);
  }
});

// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;

// Report unhandled rejections instead of crashing the process
// Make sure to monitor these reports and alert as appropriate
process.on('unhandledRejection', (err) =>
  logger.error(err, 'Unhandled promise rejection'),
);
`;

const NEW_LISTEN = `import { promisify } from 'node:util';

import { app } from './app.js';
import { config } from './config.js';
import { logger } from './framework/logging.js';
import { sdk } from './tracing.js';

// This implements a minimal version of \`koa-cluster\`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use \`koa-cluster\` to run \`lib/app\`.

const listener = app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    logger.debug(\`listening on port \${address.port}\`);
  }
});

// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;

// We have 30 seconds after receiving our SIGTERM before we will be SIGKILLed.
// Node.js runs as PID 1 in the distroless runtime image and would otherwise
// ignore SIGTERM entirely, causing the shutdown to stall for 30 seconds.
process.on('SIGTERM', () => {
  logger.info('received SIGTERM, draining connections');

  // Fall back to a hard exit just before the SIGKILL if draining stalls.
  // eslint-disable-next-line no-process-exit
  setTimeout(() => process.exit(1), 25_000).unref();

  // Stop accepting connections, drain in-flight requests, and flush spans.
  promisify(listener.close.bind(listener))()
    .then(() => sdk?.shutdown())
    .catch((err: unknown) => logger.error(err, 'failed to drain cleanly'))
    .finally(() => process.exit(0)); // eslint-disable-line no-process-exit
});

// Report unhandled rejections instead of crashing the process
// Make sure to monitor these reports and alert as appropriate
process.on('unhandledRejection', (err) =>
  logger.error(err, 'Unhandled promise rejection'),
);
`;

// `template/koa-rest-api/src/tracing.ts` before the templates were removed
const OLD_TRACING = `/**
 * OpenTelemetry tracing initialisation. This is a standalone TS/JS module that is not
 * referenced by application source code directly. It is required at runtime using the
 * node command's \`--require\` argument, see Dockerfile for details.
 */

import { propagation } from '@opentelemetry/api';
import { CompositePropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { NodeSDK } from '@opentelemetry/sdk-node';

const app = 'opentelemetry';
const log = (level: string, msg: string, extra = {}) => {
  const toLog = { msg, level, app, time: new Date().toISOString(), ...extra };
  console.log(JSON.stringify(toLog)); // eslint-disable-line no-console
};

const main = () => {
  // Use B3 propagation to ensure proper propagation between systems that use
  // OpenTelemetry and native Datadog APM, such as Istio/Envoy.
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new B3Propagator(),
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      ],
    }),
  );

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    autoDetectResources: false,
    instrumentations: [new HttpInstrumentation(), new AwsInstrumentation()],
  });

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

if (process.env.OPENTELEMETRY_ENABLED === 'true') {
  main();
} else {
  log('info', 'OpenTelemetry not enabled');
}
`;

const NEW_TRACING = `/**
 * OpenTelemetry tracing initialisation. This module is preloaded before the
 * application code using the node command's \`--require\` or \`--import\`
 * argument, see Dockerfile for details. \`listen.ts\` imports the started \`sdk\`
 * to flush spans when the process is terminated.
 */

import { propagation } from '@opentelemetry/api';
import { CompositePropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { NodeSDK } from '@opentelemetry/sdk-node';

const app = 'opentelemetry';
const log = (level: string, msg: string, extra = {}) => {
  const toLog = { msg, level, app, time: new Date().toISOString(), ...extra };
  console.log(JSON.stringify(toLog)); // eslint-disable-line no-console
};

const main = (): NodeSDK => {
  // Use B3 propagation to ensure proper propagation between systems that use
  // OpenTelemetry and native Datadog APM, such as Istio/Envoy.
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new B3Propagator(),
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      ],
    }),
  );

  const nodeSdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    autoDetectResources: false,
    instrumentations: [new HttpInstrumentation(), new AwsInstrumentation()],
  });

  nodeSdk.start();

  return nodeSdk;
};

// The SIGTERM handler in \`listen.ts\` shuts this down.
export const sdk =
  process.env.OPENTELEMETRY_ENABLED === 'true' ? main() : undefined;

if (!sdk) {
  log('info', 'OpenTelemetry not enabled');
}
`;

const DOCKERFILE = `ARG BASE_IMAGE

FROM \${BASE_IMAGE} AS build

COPY . .

RUN pnpm install --offline
RUN pnpm build

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=build /workdir/node_modules node_modules

ENV NODE_ENV=production

ARG PORT=8001
ENV PORT=\${PORT}
EXPOSE \${PORT}

CMD ["--experimental-loader", "@opentelemetry/instrumentation/hook.mjs", "--import", "./lib/tracing.js", "./lib/listen.js"]
`;

const PACKAGE_JSON = `${JSON.stringify(
  {
    name: '@seek/service',
    type: 'module',
    dependencies: {
      '@opentelemetry/sdk-node': '~0.219.0',
      'hot-shots': '^14.3.1',
      'seek-datadog-custom-metrics': '^8.0.0',
    },
  },
  null,
  2,
)}\n`;

const templateFiles = (prefix = '') => ({
  [`${prefix}Dockerfile`]: DOCKERFILE,
  [`${prefix}package.json`]: PACKAGE_JSON,
  [`${prefix}src/listen.ts`]: OLD_LISTEN,
  [`${prefix}src/tracing.ts`]: OLD_TRACING,
  [`${prefix}src/app.ts`]: 'export const app = new Koa();\n',
});

// `src/listen.ts` from the first versions of the template, before file
// extensions, `config`, the keep-alive timeout or the rejection handler
const OLDEST_LISTEN = `import './register';

import app from './app';
import { rootLogger } from './framework/logging';

// This implements a minimal version of \`koa-cluster\`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use \`koa-cluster\` to run \`lib/app\`.

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(\`listening on port \${address.port}\`);
  }
});
`;

// A consumer's copy with different comments, a default `app` import, a
// `rootLogger` and a side-effect import that must stay first
const CONSUMER_LISTEN = `/* istanbul ignore file */
import './register.js'; // MUST BE FIRST

import app from './app.js';
import { rootLogger } from './framework/logging.js';

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(\`listening on port \${address.port}\`);
  }
});

// ALB idle timeout is 30 seconds
listener.keepAliveTimeout = 31000;

process.on('unhandledRejection', (err) =>
  rootLogger.error(err, 'Unhandled promise rejection'),
);
`;

const DD_TRACE_LISTEN = `/* istanbul ignore file */
import './register.js'; // MUST BE FIRST – dd-trace must init before any other module

import app from './app.js';
import { rootLogger } from './framework/logging.js';

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(\`listening on port \${address.port}\`);
  }
});

// Gantry ALB default idle timeout is 30 seconds
listener.keepAliveTimeout = 31000;

// Report unhandled rejections instead of crashing the process
process.on('unhandledRejection', (err) =>
  rootLogger.error(err, 'Unhandled promise rejection'),
);
`;

const NEW_DD_TRACE_LISTEN = `/* istanbul ignore file */
import './register.js'; // MUST BE FIRST – dd-trace must init before any other module

import app from './app.js';
import { rootLogger } from './framework/logging.js';

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(\`listening on port \${address.port}\`);
  }
});

// Gantry ALB default idle timeout is 30 seconds
listener.keepAliveTimeout = 31000;

// We have 30 seconds after receiving our SIGTERM before we will be SIGKILLed.
// Node.js runs as PID 1 in the distroless runtime image and would otherwise
// ignore SIGTERM entirely, causing the shutdown to stall for 30 seconds.
process.on('SIGTERM', () => {
  rootLogger.info('received SIGTERM, draining connections');

  // Fall back to a hard exit just before the SIGKILL if draining stalls.
  // eslint-disable-next-line no-process-exit
  setTimeout(() => process.exit(1), 25_000).unref();

  // Stop accepting connections and drain in-flight requests.
  listener.close((err) => {
    if (err) {
      rootLogger.error(err, 'failed to drain cleanly');
    }

    // Let the process exit on its own so dd-trace flushes spans on \`beforeExit\`,
    // which \`process.exit()\` skips. If another handle keeps the process alive,
    // exit once dd-trace's periodic flush (every 2 seconds by default) has sent
    // the remaining spans.
    // eslint-disable-next-line no-process-exit
    setTimeout(() => process.exit(0), 5_000).unref();
  });
});

// Report unhandled rejections instead of crashing the process
process.on('unhandledRejection', (err) =>
  rootLogger.error(err, 'Unhandled promise rejection'),
);
`;

const DD_TRACE_REGISTER = `/* istanbul ignore file */
import tracer from 'dd-trace';
import { httpTracingConfig } from 'seek-datadog-custom-metrics';
import { TracingHeaders } from 'seek-koala';

import { rootLogger } from './framework/logging.js';

tracer.init({
  env: process.env.DD_ENV,
  hostname: 'localhost',
  sampleRate: 0.01,
  logger: rootLogger,
  logInjection: true,
  plugins: true,
  runtimeMetrics: true,
  service: process.env.DD_SERVICE,
  version: process.env.DD_VERSION,
});

const { REQUEST_ID_HEADER, ADHOC_SESSION_ID_HEADER } = TracingHeaders;

tracer.use('http', httpTracingConfig);

tracer.use('koa', {
  blocklist: ['/health', '/smoke'],
  headers: [REQUEST_ID_HEADER, ADHOC_SESSION_ID_HEADER],
  measured: true,
});
`;

const DD_TRACE_PACKAGE_JSON = `${JSON.stringify(
  {
    name: '@seek/service',
    type: 'module',
    dependencies: {
      'dd-trace': '^5.0.0',
      'hot-shots': '^14.3.1',
      'seek-datadog-custom-metrics': '^8.0.0',
    },
  },
  null,
  2,
)}\n`;

const ddTraceFiles = (prefix = '') => ({
  [`${prefix}Dockerfile`]: 'CMD ["./lib/listen.js"]\n',
  [`${prefix}package.json`]: DD_TRACE_PACKAGE_JSON,
  [`${prefix}src/listen.ts`]: DD_TRACE_LISTEN,
  [`${prefix}src/register.ts`]: DD_TRACE_REGISTER,
  [`${prefix}src/app.ts`]: 'export default new Koa();\n',
});

describe('patchListen', () => {
  it('should add the dd-trace SIGTERM handler', async () => {
    await expect(patchListen(DD_TRACE_LISTEN, 'dd-trace')).resolves.toBe(
      NEW_DD_TRACE_LISTEN,
    );
  });

  it('should bail on dd-trace if src/register.ts is not imported', async () => {
    await expect(patchListen(OLD_LISTEN, 'dd-trace')).resolves.toBeUndefined();
  });

  it('should bail on dd-trace if the file is already migrated', async () => {
    await expect(
      patchListen(NEW_DD_TRACE_LISTEN, 'dd-trace'),
    ).resolves.toBeUndefined();
  });
  it('should add the SIGTERM handler to the latest template', async () => {
    await expect(patchListen(OLD_LISTEN)).resolves.toBe(NEW_LISTEN);
  });

  it('should preserve comments, imports and identifiers', async () => {
    await expect(patchListen(CONSUMER_LISTEN)).resolves
      .toBe(`/* istanbul ignore file */
import './register.js'; // MUST BE FIRST

import { promisify } from 'node:util';

import app from './app.js';
import { rootLogger } from './framework/logging.js';
import { sdk } from './tracing.js';

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(\`listening on port \${address.port}\`);
  }
});

// ALB idle timeout is 30 seconds
listener.keepAliveTimeout = 31000;

// We have 30 seconds after receiving our SIGTERM before we will be SIGKILLed.
// Node.js runs as PID 1 in the distroless runtime image and would otherwise
// ignore SIGTERM entirely, causing the shutdown to stall for 30 seconds.
process.on('SIGTERM', () => {
  rootLogger.info('received SIGTERM, draining connections');

  // Fall back to a hard exit just before the SIGKILL if draining stalls.
  // eslint-disable-next-line no-process-exit
  setTimeout(() => process.exit(1), 25_000).unref();

  // Stop accepting connections, drain in-flight requests, and flush spans.
  promisify(listener.close.bind(listener))()
    .then(() => sdk?.shutdown())
    .catch((err: unknown) => rootLogger.error(err, 'failed to drain cleanly'))
    .finally(() => process.exit(0)); // eslint-disable-line no-process-exit
});

process.on('unhandledRejection', (err) =>
  rootLogger.error(err, 'Unhandled promise rejection'),
);
`);
  });

  it('should match extensionless imports from the oldest template', async () => {
    const patched = await patchListen(OLDEST_LISTEN);

    expect(patched).toContain("import { sdk } from './tracing';\n");
    expect(patched).toMatch(
      /\n {4}rootLogger\.debug\(`listening on port \$\{address\.port\}`\);\n {2}\}\n\}\);\n\n\/\/ We have 30 seconds/,
    );
  });

  it('should ignore formatting differences', async () => {
    await expect(
      patchListen(
        OLD_LISTEN.replace(
          "process.on('unhandledRejection', (err) =>\n  logger.error(err, 'Unhandled promise rejection'),\n);",
          "process.on('unhandledRejection', (err) => logger.error(err, 'Unhandled promise rejection'));",
        ),
      ),
    ).resolves.toContain("process.on('SIGTERM'");
  });

  it.each([
    ['the keep-alive timeout differs', OLD_LISTEN.replace('31000', '65000')],
    [
      'there is an extra statement',
      `${OLD_LISTEN}\nlistener.headersTimeout = 32000;\n`,
    ],
    [
      'there is an extra import',
      OLD_LISTEN.replace(
        "import { config } from './config.js';\n",
        "import { config } from './config.js';\nimport { db } from './db.js';\n",
      ),
    ],
    [
      'the logger is used inconsistently',
      OLD_LISTEN.replace('  logger.error(err', '  console.error(err'),
    ],
    [
      'the listener is exported',
      OLD_LISTEN.replace('const listener =', 'export const listener ='),
    ],
    [
      'a multi-line comment spans an insertion point',
      OLD_LISTEN.replace(
        'listener.keepAliveTimeout = 31000;\n',
        'listener.keepAliveTimeout = 31000; /*\n * trailing\n */\n',
      ),
    ],
    ['the file is already migrated', NEW_LISTEN],
  ])('should bail when %s', async (_, contents) => {
    await expect(patchListen(contents)).resolves.toBeUndefined();
  });
});

describe('patchTracing', () => {
  it('should remove the SIGTERM handler and export the sdk', async () => {
    await expect(patchTracing(OLD_TRACING)).resolves.toBe(NEW_TRACING);
  });

  it('should preserve customised instrumentations and comments', async () => {
    const original = OLD_TRACING.replace(
      '    instrumentations: [new HttpInstrumentation(), new AwsInstrumentation()],\n',
      '    instrumentations: [\n      new HttpInstrumentation(),\n      new KoaInstrumentation(),\n    ],\n',
    ).replace(
      'This is a standalone TS/JS module',
      'This is a custom TS/JS module',
    );

    const patched = await patchTracing(original);

    expect(patched).toContain('      new KoaInstrumentation(),\n');
    expect(patched).toContain('This is a custom TS/JS module');
    expect(patched).toContain('export const sdk =');
    expect(patched).not.toContain("process.on('SIGTERM'");
  });

  it('should normalise CRLF line endings', async () => {
    await expect(
      patchTracing(OLD_TRACING.replace(/\n/g, '\r\n')),
    ).resolves.toBe(NEW_TRACING);
  });

  it.each([
    [
      'the SIGTERM handler is customised',
      OLD_TRACING.replace(
        '.finally(() => process.exit(0)); // eslint-disable-line no-process-exit\n  });\n};',
        '.finally(() => process.exit(1)); // eslint-disable-line no-process-exit\n  });\n};',
      ),
    ],
    [
      'the SIGTERM handler has been removed',
      OLD_TRACING.replace(
        /\n {2}process\.on\('SIGTERM'[\s\S]*?\n {2}\}\);\n/,
        '\n',
      ),
    ],
    [
      'there is another SIGTERM handler',
      `${OLD_TRACING}\nprocess.on('SIGTERM', () => undefined);\n`,
    ],
    [
      'sdk is referenced elsewhere',
      OLD_TRACING.replace(
        '  sdk.start();\n',
        '  sdk.start();\n  globalThis.sdk = sdk;\n',
      ),
    ],
    [
      'sdk is used in shorthand',
      OLD_TRACING.replace(
        '  sdk.start();\n',
        '  sdk.start();\n  track({ sdk });\n',
      ),
    ],
    ['main is called more than once', `${OLD_TRACING}\nmain();\n`],
    ['nodeSdk is already declared', `${OLD_TRACING}\nconst nodeSdk = 1;\n`],
    [
      'main has a different signature',
      OLD_TRACING.replace('const main = () => {', 'const main = async () => {'),
    ],
    [
      'tracing is enabled differently',
      OLD_TRACING.replace(
        "process.env.OPENTELEMETRY_ENABLED === 'true'",
        "process.env.OTEL_ENABLED === 'true'",
      ),
    ],
    [
      'NodeSDK is not imported by name',
      OLD_TRACING.replace(
        "import { NodeSDK } from '@opentelemetry/sdk-node';",
        "import * as otel from '@opentelemetry/sdk-node';\nconst { NodeSDK } = otel;",
      ),
    ],
    ['the file is already migrated', NEW_TRACING],
  ])('should bail when %s', async (_, contents) => {
    await expect(patchTracing(contents)).resolves.toBeUndefined();
  });
});

describe('patchAutomatSigtermHandler', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
    isFileGitIgnored.mockResolvedValue(false);
  });

  it('should skip if there is no src/listen.ts', async () => {
    vol.fromJSON({ 'README.md': '' }, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no unmodified koa-rest-api src/listen.ts found',
    } satisfies PatchReturnType);
  });

  it('should skip if src/listen.ts has been customised', async () => {
    const files = {
      ...templateFiles(),
      'src/listen.ts': OLD_LISTEN.replace('31000', '65000'),
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no unmodified koa-rest-api src/listen.ts found',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should patch src/listen.ts and src/tracing.ts', async () => {
    vol.fromJSON(templateFiles(), process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const files = volToJson();

    expect(files.Dockerfile).toBe(DOCKERFILE);
    expect(files['package.json']).toBe(PACKAGE_JSON);
    expect(files['src/tracing.ts']).toBe(NEW_TRACING);
    expect(files['src/listen.ts']).toBe(NEW_LISTEN);
  });

  it('should accept a CommonJS package that preloads tracing with --require', async () => {
    vol.fromJSON(
      {
        ...templateFiles(),
        Dockerfile:
          'CMD ["--require", "./lib/tracing.js", "./lib/listen.js"]\n',
        'package.json': '{}\n',
        'src/listen.ts': OLDEST_LISTEN,
      },
      process.cwd(),
    );

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/listen.ts']).toContain(
      "import { sdk } from './tracing';\n",
    );
  });

  it('should preserve a customised src/listen.ts', async () => {
    vol.fromJSON(
      {
        ...templateFiles(),
        'src/listen.ts': CONSUMER_LISTEN,
        'src/register.ts': "import 'skuba-dive/register';\n",
      },
      process.cwd(),
    );

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const listen = volToJson()['src/listen.ts'];

    expect(listen).toMatch(
      /^\/\* istanbul ignore file \*\/\nimport '\.\/register\.js'; \/\/ MUST BE FIRST\n/,
    );
    expect(listen).toContain("  rootLogger.info('received SIGTERM");
  });

  it.each([
    ['an ES module', '{"type":"module"}', '--require'],
    ['a CommonJS module', '{}', '--import'],
  ])(
    'should skip if %s preloads tracing with %s',
    async (_, packageJson, flag) => {
      const files = {
        ...templateFiles(),
        Dockerfile: `CMD ["${flag}", "./lib/tracing.js", "./lib/listen.js"]\n`,
        'package.json': packageJson,
      };
      vol.fromJSON(files, process.cwd());

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'skip',
        reason: `Dockerfile preloads lib/tracing.js with ${flag}, which does not match the module type in package.json`,
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(files);
    },
  );

  it('should skip if package.json is missing', async () => {
    const { 'package.json': _, ...files } = templateFiles();
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'package.json not found or invalid',
    } satisfies PatchReturnType);
  });

  it('should be idempotent', async () => {
    vol.fromJSON(templateFiles(), process.cwd());

    await patchAutomatSigtermHandler(baseArgs);

    const patched = volToJson();

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no unmodified koa-rest-api src/listen.ts found',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(patched);
  });

  it('should not modify files in lint mode', async () => {
    const files = templateFiles();
    vol.fromJSON(files, process.cwd());

    await expect(
      patchAutomatSigtermHandler({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should match src/listen.ts with CRLF line endings', async () => {
    vol.fromJSON(
      {
        ...templateFiles(),
        'src/listen.ts': OLD_LISTEN.replace(/\n/g, '\r\n'),
      },
      process.cwd(),
    );

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const files = volToJson();

    expect(files['src/listen.ts']).toBe(NEW_LISTEN.replace(/\n/g, '\r\n'));
    expect(files['src/tracing.ts']).toBe(NEW_TRACING);
  });

  it('should patch a package in a monorepo', async () => {
    vol.fromJSON(templateFiles('apps/api/'), process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['apps/api/src/tracing.ts']).toBe(NEW_TRACING);
  });

  it('should skip if src/tracing.ts is missing', async () => {
    const { 'src/tracing.ts': _, ...files } = templateFiles();
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'src/tracing.ts not found',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if src/tracing.ts has been customised', async () => {
    const files = {
      ...templateFiles(),
      'src/tracing.ts': OLD_TRACING.replace(
        '  sdk.start();\n',
        '  sdk.start();\n  registerShutdown(sdk);\n',
      ),
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'src/tracing.ts has been customised',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if the Dockerfile is missing', async () => {
    const { Dockerfile: _, ...files } = templateFiles();
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'Dockerfile does not preload lib/tracing.js before lib/listen.js',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if the Dockerfile does not preload tracing', async () => {
    const files = {
      ...templateFiles(),
      Dockerfile: DOCKERFILE.replace('"--import", "./lib/tracing.js", ', ''),
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'Dockerfile does not preload lib/tracing.js before lib/listen.js',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if another file references SIGTERM', async () => {
    const files = {
      ...templateFiles(),
      'src/framework/shutdown.ts':
        "process.once('SIGTERM', () => flushMetrics());\n",
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'src/framework/shutdown.ts may already handle SIGTERM',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if another package in the repository references SIGTERM', async () => {
    const files = {
      ...templateFiles(),
      'packages/worker/src/index.mjs':
        "process.on('SIGTERM', () => process.exit(0));\n",
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'packages/worker/src/index.mjs may already handle SIGTERM',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it.each([
    [
      'src/framework/otel.ts',
      "import { shutdownTracing } from '@seek/otel-tracing';\n",
      'uses @seek/otel-tracing',
    ],
    ['src/register.ts', "import 'dd-trace/init';\n", 'uses dd-trace'],
    [
      'src/listen.ts',
      CONSUMER_LISTEN.replace(
        '// MUST BE FIRST',
        '// MUST BE FIRST – dd-trace must init before any other module',
      ),
      'uses dd-trace',
    ],
    [
      '.gantry/common.yml',
      'env:\n  NODE_OPTIONS: --import dd-trace/initialize.mjs\n',
      'uses dd-trace',
    ],
    [
      'src/framework/flags.ts',
      "import { init } from '@launchdarkly/node-server-sdk';\n",
      'uses LaunchDarkly',
    ],
    [
      'package.json',
      PACKAGE_JSON.replace(
        '"hot-shots"',
        '"datadog-metrics": "^0.12.0",\n    "hot-shots"',
      ),
      'uses datadog-metrics',
    ],
    [
      'src/framework/metrics.ts',
      'export const metricsClient = new StatsD({ maxBufferSize: 8192 });\n',
      'may buffer StatsD metrics',
    ],
    [
      'Dockerfile.worker',
      'CMD ["--import", "./lib/tracing.js", "./lib/worker.js"]\n',
      'references tracing.js',
    ],
    ['src/worker.ts', "import './tracing.js';\n", 'references tracing.js'],
    [
      'docker-compose.yml',
      'services:\n  app:\n    command: node --import ./lib/tracing.js ./lib/listen.js\n',
      'references tracing.js',
    ],
  ])('should skip if %s %s', async (file, contents, reason) => {
    const files = {
      ...templateFiles(),
      'src/register.ts': "import 'skuba-dive/register';\n",
      [file]: contents,
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: `${file} ${reason}`,
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should skip if the Dockerfile preloads tracing more than once', async () => {
    const files = {
      ...templateFiles(),
      Dockerfile: `${DOCKERFILE}# ./lib/tracing.js\n`,
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'Dockerfile references tracing.js',
    } satisfies PatchReturnType);
  });

  it('should ignore gitignored build output that references SIGTERM', async () => {
    vol.fromJSON(
      {
        ...templateFiles(),
        'lib/tracing.js': "process.on('SIGTERM', () => undefined);\n",
      },
      process.cwd(),
    );

    isFileGitIgnored.mockImplementation(({ absolutePath }) =>
      Promise.resolve(absolutePath.includes('/lib/')),
    );

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
  });

  it('should not consult gitignore outside of a Git repository', async () => {
    findRoot.mockResolvedValue(null);

    vol.fromJSON(
      {
        ...templateFiles(),
        'lib/tracing.js': "process.on('SIGTERM', () => undefined);\n",
      },
      process.cwd(),
    );

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'lib/tracing.js may already handle SIGTERM',
    } satisfies PatchReturnType);

    expect(isFileGitIgnored).not.toHaveBeenCalled();
  });

  it('should skip everything if any matching package cannot be patched', async () => {
    const files = {
      ...templateFiles('apps/a/'),
      ...templateFiles('apps/b/'),
      'apps/b/src/tracing.ts': '// custom tracing\n',
    };
    vol.fromJSON(files, process.cwd());

    await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'apps/b/src/tracing.ts has been customised',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  describe('dd-trace', () => {
    it('should patch src/listen.ts only', async () => {
      const files = ddTraceFiles();
      vol.fromJSON(files, process.cwd());

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'apply',
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual({
        ...files,
        'src/listen.ts': NEW_DD_TRACE_LISTEN,
      });
    });

    it('should allow dd-trace references elsewhere', async () => {
      vol.fromJSON(
        {
          ...ddTraceFiles(),
          'src/framework/spans.ts':
            "import tracer from 'dd-trace';\nexport const span = () => tracer.scope().active();\n",
        },
        process.cwd(),
      );

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'apply',
      } satisfies PatchReturnType);
    });

    it('should be idempotent', async () => {
      vol.fromJSON(ddTraceFiles(), process.cwd());

      await patchAutomatSigtermHandler(baseArgs);

      const patched = volToJson();

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'skip',
        reason: 'no unmodified koa-rest-api src/listen.ts found',
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(patched);
    });

    it.each([
      [
        'src/register.ts',
        'may customise the dd-trace flush interval',
        DD_TRACE_REGISTER.replace(
          '  sampleRate: 0.01,\n',
          '  sampleRate: 0.01,\n  flushInterval: 30_000,\n',
        ),
      ],
      [
        '.gantry/common.yml',
        'may customise the dd-trace flush interval',
        'env:\n  DD_TRACE_FLUSH_INTERVAL: 30000\n',
      ],
      [
        'src/register.ts',
        'may already handle SIGTERM',
        `${DD_TRACE_REGISTER}\nprocess.on('SIGTERM', () => tracer.flush());\n`,
      ],
      [
        'src/framework/metrics.ts',
        'may buffer StatsD metrics',
        'export const metricsClient = new StatsD({ bufferFlushInterval: 1000 });\n',
      ],
    ])('should skip if %s %s', async (file, reason, contents) => {
      const files = { ...ddTraceFiles(), [file]: contents };
      vol.fromJSON(files, process.cwd());

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'skip',
        reason: `${file} ${reason}`,
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(files);
    });

    it.each([
      ['does not initialise dd-trace', "import 'skuba-dive/register';\n"],
      [
        'initialises dd-trace more than once',
        `${DD_TRACE_REGISTER}\ntracer.init();\n`,
      ],
    ])(
      'should fall back to OpenTelemetry if src/register.ts %s',
      async (_, register) => {
        const files = { ...ddTraceFiles(), 'src/register.ts': register };
        vol.fromJSON(files, process.cwd());

        await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
          result: 'skip',
          reason: 'src/tracing.ts not found',
        } satisfies PatchReturnType);

        expect(volToJson()).toEqual(files);
      },
    );

    it('should skip a monorepo that mixes dd-trace and OpenTelemetry', async () => {
      const files = {
        ...templateFiles('apps/a/'),
        ...ddTraceFiles('apps/b/'),
      };
      vol.fromJSON(files, process.cwd());

      await expect(patchAutomatSigtermHandler(baseArgs)).resolves.toEqual({
        result: 'skip',
        reason: 'apps/b/package.json uses dd-trace',
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(files);
    });
  });
});
