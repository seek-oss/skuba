import latestVersion from 'latest-version';
import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryRemoveDatadogNodeOptionsHack } from './removeDatadogNodeOptionsHack.js';

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));
vi.mock('latest-version');
vi.mock('../../../../../../utils/exec.js');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
  vi.mocked(latestVersion).mockResolvedValue('12.140.0');
});

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

const packageJson = (
  deps: Record<string, string> = {
    'datadog-lambda-js': '^12.100.0',
    'dd-trace': '^5.0.0',
    pino: '^9.0.0',
  },
) => JSON.stringify({ dependencies: deps }, null, 2);

const cdkAppStack = ({
  nodeOptions = "NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs',",
  redirectHandler = 'redirectHandler: false,',
}: {
  nodeOptions?: string;
  redirectHandler?: string;
} = {}) => `import { aws_lambda_nodejs } from 'aws-cdk-lib';
import { DatadogLambda } from 'datadog-cdk-constructs-v2';

export class AppStack {
  constructor() {
    const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
      entry: './src/app.ts',
      bundling: {
        nodeModules: ['datadog-lambda-js', 'dd-trace'],
      },
      environment: {
        ${nodeOptions}
      },
    });

    const dd = new DatadogLambda(this, 'datadog', {
      enableDatadogLogs: false,
      ${redirectHandler}
    });
  }
}
`;

describe('removeDatadogNodeOptionsHack', () => {
  it('skips when there is no hack to remove', async () => {
    const input = {
      'appStack.ts': cdkAppStack({ redirectHandler: '' }),
      'package.json': packageJson(),
    };
    vol.fromJSON(input);

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no datadog lambda hack to remove',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('reverses the CDK hack and bumps datadog-lambda-js while keeping dd-trace', async () => {
    vol.fromJSON({
      'appStack.ts': cdkAppStack(),
      'package.json': packageJson(),
    });

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "appStack.ts": "import { aws_lambda_nodejs } from 'aws-cdk-lib';
      import { DatadogLambda } from 'datadog-cdk-constructs-v2';

      export class AppStack {
        constructor() {
          const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
            entry: './src/app.ts',
            bundling: {
              nodeModules: ['datadog-lambda-js', 'dd-trace'],
            },
            environment: {
              NODE_OPTIONS: '--enable-source-maps',
            },
          });

          const dd = new DatadogLambda(this, 'datadog', {
            enableDatadogLogs: false,
          });
        }
      }
      ",
        "package.json": "{
        "dependencies": {
          "datadog-lambda-js":"^12.140.0",
          "dd-trace": "^5.0.0",
          "pino": "^9.0.0"
        }
      }",
      }
    `);
  });

  it('removes a NODE_OPTIONS that only held the dd-trace import while keeping dd-trace', async () => {
    vol.fromJSON({
      'appStack.ts': cdkAppStack({
        nodeOptions: "NODE_OPTIONS: '--import dd-trace/initialize.mjs',",
      }),
      'package.json': packageJson(),
    });

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "appStack.ts": "import { aws_lambda_nodejs } from 'aws-cdk-lib';
      import { DatadogLambda } from 'datadog-cdk-constructs-v2';

      export class AppStack {
        constructor() {
          const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
            entry: './src/app.ts',
            bundling: {
              nodeModules: ['datadog-lambda-js', 'dd-trace'],
            },
            environment: {
            },
          });

          const dd = new DatadogLambda(this, 'datadog', {
            enableDatadogLogs: false,
          });
        }
      }
      ",
        "package.json": "{
        "dependencies": {
          "datadog-lambda-js":"^12.140.0",
          "dd-trace": "^5.0.0",
          "pino": "^9.0.0"
        }
      }",
      }
    `);
  });

  it('reverses the serverless hack', async () => {
    vol.fromJSON({
      'foo.ts': `import { datadog } from 'datadog-lambda-js';\n`,
      'serverless.yml': `provider:
  environment:
    NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs'
custom:
  datadog:
    addLayers: false
    redirectHandlers: false
`,
      'package.json': packageJson(),
    });

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "foo.ts": "import { datadog } from 'datadog-lambda-js';
      ",
        "package.json": "{
        "dependencies": {
          "datadog-lambda-js":"^12.140.0",
          "dd-trace": "^5.0.0",
          "pino": "^9.0.0"
        }
      }",
        "serverless.yml": "provider:
        environment:
          NODE_OPTIONS: '--enable-source-maps'
      custom:
        datadog:
          addLayers: false
      ",
      }
    `);
  });

  it('removes the redirectHandlers line including a trailing TODO comment', async () => {
    vol.fromJSON({
      'foo.ts': `import { datadog } from 'datadog-lambda-js';\n`,
      'serverless.yml': `provider:
  environment:
    NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs'
custom:
  datadog:
    addLayers: false
    redirectHandlers: false # TODO: Wrap your handler with the \`datadog\` function wrapper from \`datadog-lambda-js\` or the \`withLambdaExtension\` function wrapper from \`seek-datadog-custom-metrics/lambda\`. Alternatively, remove this setting and enable addLayers: true
`,
      'package.json': packageJson(),
    });

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "foo.ts": "import { datadog } from 'datadog-lambda-js';
      ",
        "package.json": "{
        "dependencies": {
          "datadog-lambda-js":"^12.140.0",
          "dd-trace": "^5.0.0",
          "pino": "^9.0.0"
        }
      }",
        "serverless.yml": "provider:
        environment:
          NODE_OPTIONS: '--enable-source-maps'
      custom:
        datadog:
          addLayers: false
      ",
      }
    `);
  });

  it('does not write in lint mode', async () => {
    const input = {
      'appStack.ts': cdkAppStack(),
      'package.json': packageJson(),
    };
    vol.fromJSON(input);

    await expect(
      tryRemoveDatadogNodeOptionsHack({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });
});
