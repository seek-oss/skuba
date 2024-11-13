import memfs, { vol } from 'memfs';

import { getLatestNode22Types, nodeVersionMigration } from '.';

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));
jest.mock('../../../utils/logging');

jest
  .spyOn(global, 'fetch')
  .mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ 'dist-tags': { latest: '22.9.0' } })),
    ),
  );

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

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
        '.buildkite/pipline3.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: public.ecr.aws/docker/library/node:20-alpine\n',
        '.node-version': '18.1.2\n',
        '.node-version2': 'v20.15.0\n',
      },
      filesAfter: {
        '.nvmrc': '22\n',
        Dockerfile: 'FROM node:22\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:22-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs22.x\n  region: ap-southeast-2',
        'serverless.melb.yaml':
          'provider:\n  logRetentionInDays: 7\n  runtime: nodejs22.x\n  region: ap-southeast-4',
        'infra/myCoolStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_22_X,\n}`,
        'infra/myCoolFolder/evenCoolerStack.ts': `const worker = new aws_lambda.Function(this, 'worker', {\n  architecture: aws_lambda.Architecture[architecture],\n  code: new aws_lambda.AssetCode('./lib'),\n  runtime: aws_lambda.Runtime.NODEJS_22_X,\n}`,
        '.buildkite/pipeline.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:22-slim\n',
        '.buildkite/pipeline2.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: node:22\n',
        '.buildkite/pipline3.yml':
          'plugins:\n  - docker#v3.0.0:\n      image: public.ecr.aws/docker/library/node:22-alpine\n',
        '.node-version': '22\n',
        '.node-version2': 'v22\n',
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
        'Dockerfile.11':
          'FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs20-debian12@sha256:9f43117c3e33c3ed49d689e51287a246edef3af0afed51a54dc0a9095b2b3ef9 AS runtime',
        'Dockerfile.12':
          '# syntax=docker/dockerfile:1.10@sha256:865e5dd094beca432e8c0a1d5e1c465db5f998dca4e439981029b3b81fb39ed5\nFROM --platform=arm64 node:20@sha256:a5e0ed56f2c20b9689e0f7dd498cac7e08d2a3a283e92d9304e7b9b83e3c6ff3 AS dev-deps',
        'Dockerfile.13':
          'FROM public.ecr.aws/docker/library/node:20-alpine@sha256:c13b26e7e602ef2f1074aef304ce6e9b7dd284c419b35d89fcf3cc8e44a8def9 AS runtime',
      },
      filesAfter: {
        '.nvmrc': '22\n',
        'Dockerfile.1': 'FROM node:22\nRUN echo "hello"',
        'Dockerfile.2': 'FROM node:22\nRUN echo "hello"',
        'Dockerfile.3': 'FROM node:22-slim\nRUN echo "hello"',
        'Dockerfile.4': 'FROM node:22-slim\nRUN echo "hello"',
        'Dockerfile.5':
          'FROM --platform=linux/amd64 node:22 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.6':
          'FROM --platform=linux/amd64 node:22 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.7':
          'FROM --platform=linux/amd64 node:22-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.8':
          'FROM --platform=linux/amd64 node:22-slim AS dev-deps\nRUN echo "hello"',
        'Dockerfile.9':
          'FROM gcr.io/distroless/nodejs22-debian12\nRUN echo "hello"',
        'Dockerfile.10':
          'FROM --platform=linux/amd64 gcr.io/distroless/nodejs22-debian12 AS dev-deps\nRUN echo "hello"',
        'Dockerfile.11':
          'FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs22-debian12 AS runtime',
        'Dockerfile.12':
          '# syntax=docker/dockerfile:1.10@sha256:865e5dd094beca432e8c0a1d5e1c465db5f998dca4e439981029b3b81fb39ed5\nFROM --platform=arm64 node:22 AS dev-deps',
        'Dockerfile.13':
          'FROM public.ecr.aws/docker/library/node:22-alpine AS runtime',
      },
    },
    {
      scenario: 'already node 22',
      filesBefore: {
        '.nvmrc': '22\n',
        Dockerfile: 'FROM node:22\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:22-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs22.x\n  region: ap-southeast-2',
      },
    },
    {
      scenario: 'not detectable',
      filesBefore: {
        Dockerfile: 'FROM node:latest\nRUN echo "hello"',
      },
    },
    {
      scenario: 'node types',
      filesBefore: {
        'package.json': '"@types/node": "^14.0.0"',
        '1/package.json': '"@types/node": "18.0.0"',
        '2/package.json': `"engines": {\n"node": ">=18"\n},\n`,
        '3/package.json': `"engines": {\n"node": ">=18"\n},\n"skuba": {\n"type": "package"\n}`,
        '4/package.json': `"engines": {\n"node": ">=18"\n},\n"skuba": {\n"type": "application"\n}`,
      },
      filesAfter: {
        'package.json': '"@types/node": "^22.9.0"',
        '1/package.json': '"@types/node": "22.9.0"',
        '2/package.json': `"engines": {\n"node": ">=22"\n},\n`,
        '3/package.json': `"engines": {\n"node": ">=18"\n},\n"skuba": {\n"type": "package"\n}`,
        '4/package.json': `"engines": {\n"node": ">=22"\n},\n"skuba": {\n"type": "application"\n}`,
      },
    },
    {
      scenario: 'tsconfig target',
      filesBefore: {
        'tsconfig.json': '"target": "ES2020"',
        '1/tsconfig.json': '"target": "es2014"',
        '2/tsconfig.json': '"target": "ESNext"',
      },
      filesAfter: {
        'tsconfig.json': '"target": "ES2024"',
        '1/tsconfig.json': '"target": "ES2024"',
        '2/tsconfig.json': '"target": "ES2024"',
      },
    },
    {
      scenario: 'docker-compose.yml target',
      filesBefore: {
        'docker-compose.yml': 'image: node:18.1.2\n',
        'docker-compose.dev.yml': 'image: node:18\n',
        'docker-compose.prod.yml': 'image: node:18-slim\n',
      },
      filesAfter: {
        'docker-compose.yml': 'image: node:22\n',
        'docker-compose.dev.yml': 'image: node:22\n',
        'docker-compose.prod.yml': 'image: node:22-slim\n',
      },
    },
  ];

  it.each(scenarios)(
    'handles $scenario',
    async ({ filesBefore, filesAfter }) => {
      vol.fromJSON(filesBefore, process.cwd());

      await nodeVersionMigration(22);

      expect(volToJson()).toEqual(filesAfter ?? filesBefore);
    },
  );
});

describe('getLatestNode22Types', () => {
  it('fetches the latest node types version', async () => {
    const { version, err } = await getLatestNode22Types();
    expect(version).toBe('22.9.0');
    expect(err).toBeUndefined();
  });
  it('defaults to 22.9.0 if the fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => Promise.reject());
    const { version, err } = await getLatestNode22Types();

    expect(version).toBe('22.9.0');
    expect(err).toBe('Failed to fetch latest version, using fallback version');
  });
});
