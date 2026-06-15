import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryAddDdTraceEsmImport } from './addDdTraceEsmImport.js';

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

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
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
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

const cdkAppStack = ({
  nodeModules = "['datadog-lambda-js', 'dd-trace']",
  redirectHandler = 'redirectHandler: false,',
  nodeOptions = "NODE_OPTIONS: '--enable-source-maps',",
}: {
  nodeModules?: string;
  redirectHandler?: string;
  nodeOptions?: string;
} = {}) => `import { aws_lambda_nodejs } from 'aws-cdk-lib';
import { DatadogLambda } from 'datadog-cdk-constructs-v2';

export class AppStack {
  constructor() {
    const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
      entry: './src/app.ts',
      bundling: {
        nodeModules: ${nodeModules},
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

describe('addDdTraceEsmImport', () => {
  it('skips when there are no lambdas', async () => {
    vol.fromJSON({
      'src/index.ts': `export const noop = () => {};\n`,
    });

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no lambdas to patch',
    } satisfies PatchReturnType);
  });

  it('skips when handler redirection is not disabled', async () => {
    const input = { 'appStack.ts': cdkAppStack({ redirectHandler: '' }) };
    vol.fromJSON(input);

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no lambdas to patch',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('skips when the import is already present', async () => {
    const input = {
      'appStack.ts': cdkAppStack({
        nodeOptions:
          "NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs',",
      }),
    };
    vol.fromJSON(input);

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no lambdas to patch',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('appends the dd-trace import to NODE_OPTIONS for a CDK lambda', async () => {
    vol.fromJSON({ 'appStack.ts': cdkAppStack() });

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
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
              NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs',
            },
          });

          const dd = new DatadogLambda(this, 'datadog', {
            enableDatadogLogs: false,
            redirectHandler: false,
          });
        }
      }
      ",
      }
    `);
  });

  it('does not write in lint mode', async () => {
    const input = { 'appStack.ts': cdkAppStack() };
    vol.fromJSON(input);

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('appends the dd-trace import to an existing serverless NODE_OPTIONS', async () => {
    vol.fromJSON({
      'foo.ts': `import { datadog } from 'datadog-lambda-js';\n`,
      'serverless.yml': `provider:
  environment:
    NODE_OPTIONS: '--enable-source-maps'
custom:
  datadog:
    addLayers: false
    redirectHandlers: false
`,
    });

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "foo.ts": "import { datadog } from 'datadog-lambda-js';
      ",
        "serverless.yml": "provider:
        environment:
          NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs'
      custom:
        datadog:
          addLayers: false
          redirectHandlers: false
      ",
      }
    `);
  });

  it('skips serverless when datadog-lambda-js is not imported', async () => {
    const input = {
      'serverless.yml': `provider:
  environment:
    NODE_OPTIONS: '--enable-source-maps'
custom:
  datadog:
    addLayers: false
    redirectHandlers: false
`,
    };
    vol.fromJSON(input);

    await expect(
      tryAddDdTraceEsmImport({ ...baseArgs, mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no lambdas to patch',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });
});
