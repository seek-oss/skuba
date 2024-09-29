import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchConfig } from '../..';

import { tryPatchDockerImages } from './patchDockerImages';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchDockerImages', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if no Dockerfile or docker-compose files are found', async () => {
    jest.mocked(fg).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files found',
    });
  });

  it('should skip if no Dockerfile or docker-compose files need to be patched', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['docker-compose.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce('beep' as never)
      .mockResolvedValueOnce('boop' as never);

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files to patch',
    });
  });

  it('should skip already patched Dockerfile and docker-compose files', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['docker-compose.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        'FROM public.ecr.aws/docker/library/node:18\n' as never,
      )
      .mockResolvedValueOnce(
        '    image: public.ecr.aws/docker/library/node:14\n' as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files to patch',
    });
  });

  it('should skip a Dockerfile with multiple platforms', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce([]);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('FROM --platform=arm64 public.ecr.aws/docker/library/node:18\n' +
          'FROM --platform=amd64 public.ecr.aws/docker/library/node:18\n') as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files to patch',
    });
  });

  it('should skip a Dockerfile with a build arg platform', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce([]);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        'FROM --platform=$BUILDPLATFORM public.ecr.aws/docker/library/node:18\n' as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files to patch',
    });
  });

  it('should patch a simple Dockerfile and docker-compose file', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['docker-compose.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce('FROM --platform=arm64 node:18\n' as never)
      .mockResolvedValueOnce('    image: node:14\n' as never);

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      'FROM public.ecr.aws/docker/library/node:18\n',
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      'docker-compose.yml',
      '    image: public.ecr.aws/docker/library/node:14\n',
    );
  });

  it('should patch a Dockerfile with invalid platform usage and already patched base images', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce([]);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('FROM --platform=arm64 public.ecr.aws/docker/library/node:18\n' +
          'FROM --platform=arm64 public.ecr.aws/docker/library/node:18\n') as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      'FROM public.ecr.aws/docker/library/node:18\n' +
        'FROM public.ecr.aws/docker/library/node:18\n',
    );
  });

  it('should patch multiple lines in Dockerfile and docker-compose files with the same platform', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['docker-compose.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.10\n' +
          '\n' +
          'FROM --platform=arm64 node:20-alpine AS dev-deps\n' +
          'FROM --otherflag=bar --platform=arm64 node:20-alpine\n' +
          'FROM --otherflag=boo --platform=arm64 --anotherflag=coo node:20-alpine\n' +
          'FROM gcr.io/distroless/nodejs20-debian12 AS runtime\n' +
          'FROM --newflag node:latest\n' +
          'FROM node:12:@940049cabf21bf4cd20b86641c800c2b9995e4fb85fa4698b1781239fc0f6853') as never,
      )
      .mockResolvedValueOnce(
        ('services:\n' +
          '  app:\n' +
          '    image: node:20-alpine\n' +
          '    init: true\n' +
          '    volumes:\n' +
          '      - ./:/workdir\n' +
          '      # Mount agent for Buildkite annotations.\n' +
          '      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent\n' +
          '      # Mount cached dependencies.\n' +
          '      - /workdir/node_modules\n' +
          '  other:\n' +
          '    image: python:3.9\n') as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      '# syntax=docker/dockerfile:1.10\n' +
        '\n' +
        'FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps\n' +
        'FROM --otherflag=bar public.ecr.aws/docker/library/node:20-alpine\n' +
        'FROM --otherflag=boo --anotherflag=coo public.ecr.aws/docker/library/node:20-alpine\n' +
        'FROM gcr.io/distroless/nodejs20-debian12 AS runtime\n' +
        'FROM --newflag public.ecr.aws/docker/library/node:latest\n' +
        'FROM public.ecr.aws/docker/library/node:12:@940049cabf21bf4cd20b86641c800c2b9995e4fb85fa4698b1781239fc0f6853',
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      'docker-compose.yml',
      'services:\n' +
        '  app:\n' +
        '    image: public.ecr.aws/docker/library/node:20-alpine\n' +
        '    init: true\n' +
        '    volumes:\n' +
        '      - ./:/workdir\n' +
        '      # Mount agent for Buildkite annotations.\n' +
        '      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent\n' +
        '      # Mount cached dependencies.\n' +
        '      - /workdir/node_modules\n' +
        '  other:\n' +
        '    image: public.ecr.aws/docker/library/python:3.9\n',
    );
  });

  it('should patch multiple lines in Dockerfile and docker-compose files with multiple platforms', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['docker-compose.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.10\n' +
          '\n' +
          'FROM --platform=amd64 node:20-alpine AS dev-deps\n' +
          'FROM --otherflag=bar --platform=arm64 node:20-alpine\n' +
          'FROM --otherflag=boo --platform=arm64 --anotherflag=coo node:20-alpine\n' +
          'FROM gcr.io/distroless/nodejs20-debian12 AS runtime\n' +
          'FROM --newflag node:latest\n' +
          'FROM node:12:@940049cabf21bf4cd20b86641c800c2b9995e4fb85fa4698b1781239fc0f6853') as never,
      )
      .mockResolvedValueOnce(
        ('services:\n' +
          '  app:\n' +
          '    image: node:20-alpine\n' +
          '    init: true\n' +
          '    volumes:\n' +
          '      - ./:/workdir\n' +
          '      # Mount agent for Buildkite annotations.\n' +
          '      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent\n' +
          '      # Mount cached dependencies.\n' +
          '      - /workdir/node_modules\n' +
          '  other:\n' +
          '    image: python:3.9\n') as never,
      );

    await expect(
      tryPatchDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      '# syntax=docker/dockerfile:1.10\n' +
        '\n' +
        'FROM --platform=amd64 public.ecr.aws/docker/library/node:20-alpine AS dev-deps\n' +
        'FROM --otherflag=bar --platform=arm64 public.ecr.aws/docker/library/node:20-alpine\n' +
        'FROM --otherflag=boo --platform=arm64 --anotherflag=coo public.ecr.aws/docker/library/node:20-alpine\n' +
        'FROM gcr.io/distroless/nodejs20-debian12 AS runtime\n' +
        'FROM --newflag public.ecr.aws/docker/library/node:latest\n' +
        'FROM public.ecr.aws/docker/library/node:12:@940049cabf21bf4cd20b86641c800c2b9995e4fb85fa4698b1781239fc0f6853',
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      'docker-compose.yml',
      'services:\n' +
        '  app:\n' +
        '    image: public.ecr.aws/docker/library/node:20-alpine\n' +
        '    init: true\n' +
        '    volumes:\n' +
        '      - ./:/workdir\n' +
        '      # Mount agent for Buildkite annotations.\n' +
        '      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent\n' +
        '      # Mount cached dependencies.\n' +
        '      - /workdir/node_modules\n' +
        '  other:\n' +
        '    image: public.ecr.aws/docker/library/python:3.9\n',
    );
  });
});
