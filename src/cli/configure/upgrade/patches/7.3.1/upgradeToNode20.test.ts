import memfs, { vol } from 'memfs';

import type { PatchReturnType } from '../..';

import { tryUpgradeToNode20 } from './upgradeToNode20';

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

const reason = 'unable to find any Node.js 20 usage';

describe('tryUpgradeToNode20', () => {
  const scenarios: Array<{
    filesBefore: Record<string, string>;
    filesAfter?: Record<string, string>;
    result: PatchReturnType;
    scenario: string;
  }> = [
    {
      scenario: 'an empty project',
      filesBefore: {},
      result: { result: 'skip', reason },
    },
    {
      scenario: 'several files to patch',
      filesBefore: {
        '.nvmrc': 'v18.1.2',
        Dockerfile: 'FROM node:18.1.2\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:18-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs18.x\n  region: ap-southeast-2',
        'serverless.melb.yaml':
          'provider:\n  logRetentionInDays: 7\n  runtime: nodejs16.x\n  region: ap-southeast-4',
      },
      filesAfter: {
        '.nvmrc': '20',
        Dockerfile: 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs20.x\n  region: ap-southeast-2',
        'serverless.melb.yaml':
          'provider:\n  logRetentionInDays: 7\n  runtime: nodejs20.x\n  region: ap-southeast-4',
      },
      result: { result: 'apply' },
    },
    {
      scenario: 'various node formats',
      filesBefore: {
        '.nvmrc': '18.3.4',
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
        '.nvmrc': '20',
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
      result: { result: 'apply' },
    },
    {
      scenario: 'already node 20',
      filesBefore: {
        '.nvmrc': '20',
        Dockerfile: 'FROM node:20\nRUN echo "hello"',
        'Dockerfile.dev-deps':
          'FROM --platform=linux/amd64 node:20-slim AS dev-deps\nRUN echo "hello"',
        'serverless.yml':
          'provider:\n  logRetentionInDays: 30\n  runtime: nodejs20.x\n  region: ap-southeast-2',
      },
      result: { result: 'skip', reason },
    },
    {
      scenario: 'not detectable',
      filesBefore: {
        '.nvmrc': 'lts/*',
        Dockerfile: 'FROM node:latest\nRUN echo "hello"',
      },
      result: { result: 'skip', reason },
    },
  ];

  describe('format mode', () => {
    it.each(scenarios)(
      'handles $scenario',
      async ({ filesBefore, filesAfter, result: expected }) => {
        vol.fromJSON(filesBefore, process.cwd());

        const result = await tryUpgradeToNode20('format');

        expect(result).toEqual(expected);
        expect(volToJson()).toEqual(filesAfter ?? filesBefore);
      },
    );
  });

  describe('lint mode', () => {
    it.each(scenarios)(
      'handles $scenario',
      async ({ filesBefore, result: expected }) => {
        vol.fromJSON(filesBefore, process.cwd());

        const result = await tryUpgradeToNode20('lint');

        expect(result).toEqual(expected);
        expect(volToJson()).toEqual(filesBefore); // no changes
      },
    );
  });
});
