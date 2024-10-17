import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchConfig } from '../..';

import { tryPatchPnpmDockerImages } from './patchPnpmDockerImages';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchPnpmDockerImages', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if no Dockerfiles found', async () => {
    jest.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles found',
    });
  });

  it('should skip if no Dockerfiles to patch', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest.mocked(readFile).mockResolvedValueOnce('beep' as never);

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });
  });

  it('should skip if mode is lint', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest.mocked(readFile).mockResolvedValueOnce('beep' as never);

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });
  });

  it('should patch Dockerfiles', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest.mocked(readFile).mockResolvedValueOnce(
      `# syntax=docker/dockerfile:1.10

FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm fetch
` as never,
    );

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `# syntax=docker/dockerfile:1.10

FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN --mount=type=bind,source=package.json,target=package.json \\
    pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm fetch
`,
    );
  });
});
