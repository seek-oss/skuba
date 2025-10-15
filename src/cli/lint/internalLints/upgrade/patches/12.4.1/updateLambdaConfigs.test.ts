import memfs, { vol } from 'memfs';

import { Git } from '../../../../../../index.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryUpdateLambdaConfigs } from './updateLambdaConfigs.js';

jest.mock('../../../../../../index.js', () => ({
  Git: {
    getOwnerAndRepo: jest.fn(),
  },
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string, opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

jest.spyOn(console, 'warn').mockImplementation(() => {
  /* do nothing */
});
jest.spyOn(console, 'log').mockImplementation(() => {
  /* do nothing */
});

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
  jest
    .mocked(Git.getOwnerAndRepo)
    .mockResolvedValue({ repo: 'test-repo', owner: 'seek' });
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

describe('tryUpdateLambdaConfigs', () => {
  it('should skip if repository name cannot be determined', async () => {
    jest
      .mocked(Git.getOwnerAndRepo)
      .mockRejectedValue(new Error('no repo found'));

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no repository name found',
    });
  });

  it('should skip if no ts, yml or js files are found', async () => {
    vol.fromJSON({});

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no .ts or webpack config files or .yml files found',
    });
  });

  it('should update lambda configs in .ts files', async () => {
    vol.fromJSON({
      'lambda.ts': `
const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
  architecture: aws_lambda.Architecture[architecture],
  runtime: aws_lambda.Runtime.NODEJS_22_X,
  memorySize: 512,
  entry: './src/app.ts',
  bundling: {
    sourceMap: true,
    target: 'node22',
    externalModules: [],
  },
});
const another = new aws_lambda_nodejs.NodejsFunction(this, 'another', {
  architecture: aws_lambda.Architecture[architecture],
  runtime: aws_lambda.Runtime.NODEJS_22_X,
  memorySize: 512,
  entry: './src/app.ts',
  bundling: {
    sourceMap: true,
    esbuildArgs: { '--other': 'foo' },
    target: 'node22',
    externalModules: [],
  },
});
      `,
    });

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "lambda.ts": "
      const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
        architecture: aws_lambda.Architecture[architecture],
        runtime: aws_lambda.Runtime.NODEJS_22_X,
        memorySize: 512,
        entry: './src/app.ts',
        bundling: {
          esbuildArgs: { '--conditions': '@seek/test-repo/source' },
          sourceMap: true,
          target: 'node22',
          externalModules: [],
        },
      });
      const another = new aws_lambda_nodejs.NodejsFunction(this, 'another', {
        architecture: aws_lambda.Architecture[architecture],
        runtime: aws_lambda.Runtime.NODEJS_22_X,
        memorySize: 512,
        entry: './src/app.ts',
        bundling: {
          sourceMap: true,
          esbuildArgs: {'--conditions': '@seek/test-repo/source', '--other': 'foo'},
          target: 'node22',
          externalModules: [],
        },
      });
            ",
      }
    `);
  });

  it('should update lambda configs in webpack config files', async () => {
    vol.fromJSON({
      'webpack.config.js': `
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  target: 'node22',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});`,
      'other/webpack.config.js': `
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  target: 'node22',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  }
});`,
    });

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "other/webpack.config.js": "
      const path = require('path');

      module.exports = {
        resolve: {
          conditionNames: ['@seek/test-repo/source', '...'],
        },
        entry: './src/index.ts',
        target: 'node22',
        mode: 'production',
        module: {
          rules: [
            {
              test: /\\.tsx?$/,
              use: 'ts-loader',
              exclude: /node_modules/,
            },
          ],
        }
      );",
        "webpack.config.js": "
      const path = require('path');

      module.exports = {
        entry: './src/index.ts',
        target: 'node22',
        mode: 'production',
        module: {
          rules: [
            {
              test: /\\.tsx?$/,
              use: 'ts-loader',
              exclude: /node_modules/,
            },
          ],
        },
        resolve: {
          conditionNames: ['@seek/test-repo/source', '...'],
          extensions: ['.ts', '.js', '.json'],
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
        },
      );",
      }
    `);
  });

  it('should update Serverless files with esbuild configuration', async () => {
    vol.fromJSON({
      'serverless.yml': `service: my-lambda-service

plugins:
  - serverless-esbuild

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node22

functions:
  myFunction:
    handler: src/handler.main
      `,
      'serverless.yaml': `service: my-lambda-service

build:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node22

functions:
  myFunction:
    handler: src/handler.main
      `,
      'serverless.other.yml': `service: my-lambda-service

plugins:
  - serverless-esbuild

build:
  esbuild: false

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node22

functions:
  myFunction:
    handler: src/handler.main
      `,
    });

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "serverless.other.yml": "service: my-lambda-service

      plugins:
        - serverless-esbuild

      build:
        esbuild: false

      custom:
        esbuild:
          conditions:
            - '@seek/test-repo/source'
          bundle: true
          minify: false
          sourcemap: true
          target: node22

      functions:
        myFunction:
          handler: src/handler.main
            ",
        "serverless.yaml": "service: my-lambda-service

      build:
        esbuild:
          conditions:
            - '@seek/test-repo/source'
          bundle: true
          minify: false
          sourcemap: true
          target: node22

      functions:
        myFunction:
          handler: src/handler.main
            ",
        "serverless.yml": "service: my-lambda-service

      plugins:
        - serverless-esbuild

      custom:
        esbuild:
          conditions:
            - '@seek/test-repo/source'
          bundle: true
          minify: false
          sourcemap: true
          target: node22

      functions:
        myFunction:
          handler: src/handler.main
            ",
      }
    `);
  });

  it('should update Serverless files with package patterns', async () => {
    vol.fromJSON({
      'serverless.yml': `
service: my-lambda-service

package:
  patterns:
    - '!**'
    - 'lib/**'

functions:
  myFunction:
    handler: src/handler.main
    package:
      patterns:
        - excluded-by-default.json
      `,
      'serverless.yaml': `
service: my-lambda-service

functions:
  myFunction:
    handler: src/handler.main

package:
  patterns:
    - '!**'
    - 'lib/**'
      `,
    });

    await expect(
      tryUpdateLambdaConfigs({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "serverless.yaml": "
      service: my-lambda-service

      functions:
        myFunction:
          handler: src/handler.main

      package:
        patterns:
          - '!**'
          - 'lib/**'
          - 'package.json'
            ",
        "serverless.yml": "
      service: my-lambda-service

      package:
        patterns:
          - '!**'
          - 'lib/**'
          - 'package.json'

      functions:
        myFunction:
          handler: src/handler.main
          package:
            patterns:
              - excluded-by-default.json
              - 'package.json'
            ",
      }
    `);
  });
});
