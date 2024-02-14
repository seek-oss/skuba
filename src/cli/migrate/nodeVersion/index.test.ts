import memfs, { vol } from 'memfs';

import { nodeVersionMigration } from '.';

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));
jest.mock('../../../utils/logging');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

describe('nodeVersionMigration', () => {
  const scenarios: Array<{
    filesBefore: Record<string, string>;
    filesAfter?: Record<string, string>;
    scenario: string;
  }> = [
    {
      scenario: 'an empty project',
      filesBefore: {},
    },
    {
      scenario: 'several files to patch',
      filesBefore: {
        '.nvmrc': 'v18.1.2\n',
        Dockerfile: 'FROM node:18.1.2\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:18-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs18.x\n  region: ap-southeast-2',
        'serverless.melb.yaml':
          'provider:\n  logRetentionInDays: 7\n  runtime: nodejs16.x\n  region: ap-southeast-4',
        'infra/myCoolStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_18_X,\n}`,
        'infra/myCoolFolder/evenCoolerStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_16_X,\n}`,
        '.buildkite/pipeline.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:18.1.2-slim\n',
        '.buildkite/pipeline2.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:18\n',
      },
      filesAfter: {
        '.nvmrc': '20\n',
        Dockerfile: 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs20.x\n  region: ap-southeast-2',
        'serverless.melb.yaml':
          'provider:\n  logRetentionInDays: 7\n  runtime: nodejs20.x\n  region: ap-southeast-4',
        'infra/myCoolStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_20_X,\n}`,
        'infra/myCoolFolder/evenCoolerStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_20_X,\n}`,
        '.buildkite/pipeline.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:20-slim\n',
        '.buildkite/pipeline2.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:20\n',
      },
    },
    {
      scenario: 'various node formats',
      filesBefore: {
        '.nvmrc': '18.3.4\n',
        'Dockerfile.1': 'FROM node:18.1.2\nRUN echo "hello"',
        'Dockerfile.2': 'FROM node:18\nRUN echo "hello"',
        'Dockerfile.3': 'FROM node:18-slim\nRUN echo "hello"',
        'Dockerfile.4': 'FROM node:18.1.2-slim\nRUN echo "hello"',
        'Dockerfile.5':
          'FROM --platform=linux/amd64 node:18.1.2 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.6':
          'FROM --platform=linux/amd64 node:18 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.7':
          'FROM --platform=linux/amd64 node:18-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.8':
          'FROM --platform=linux/amd64 node:18.1.2-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.9':
          'FROM gcr.io/distroless/nodejs18-debian12\nRUN echo "hello"',
        'Dockerfile.10':
          'FROM --platform=linux/amd64 gcr.io/distroless/nodejs18-debian12 AS dev-deps\nRUN echo "hello"',
      },
      filesAfter: {
        '.nvmrc': '20\n',
        'Dockerfile.1': 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.2': 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.3': 'FROM node:20-slim\nRUN echo "hello"',
        'Dockerfile.4': 'FROM node:20-slim\nRUN echo "hello"',
        'Dockerfile.5':
          'FROM --platform=linux/amd64 node:20 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.6':
          'FROM --platform=linux/amd64 node:20 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.7':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.8':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.9':
          'FROM gcr.io/distroless/nodejs20-debian12\nRUN echo "hello"',
        'Dockerfile.10':
          'FROM --platform=linux/amd64 gcr.io/distroless/nodejs20-debian12 AS dev-deps\nRUN echo "hello"',
      },
    },
    {
      scenario: 'already node 20',
      filesBefore: {
        '.nvmrc': '20\n',
        Dockerfile: 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs20.x\n  region: ap-southeast-2',
      },
    },
    {
      scenario: 'not detectable',
      filesBefore: {
        Dockerfile: 'FROM node:latest\nRUN echo "hello"',
      },
    },
  ];

  it.each(scenarios)(
    'handles $scenario',
    async ({ filesBefore, filesAfter }) => {
      vol.fromJSON(filesBefore, process.cwd());

      await nodeVersionMigration(20);

      expect(volToJson()).toEqual(filesAfter ?? filesBefore);
    },
  );
});
