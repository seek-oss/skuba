import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchDockerfilePruneProd } from './patchDockerfilePruneProd.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchDockerfilePruneProd', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no dockerfiles found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no dockerfiles found',
    } satisfies PatchReturnType);
  });

  it('should skip if dockerfiles do not contain pnpm install --prod commands', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM node:18\nRUN npm install',
    );
    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod',
    );

    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it('should replace pnpm install --prod with pnpm prune --prod', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod',
    );

    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm prune --prod',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should replace CI=true pnpm install --prod with pnpm prune --prod', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --offline --prod',
    );

    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm prune --prod',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should patch multiple dockerfiles', async () => {
    vi.mocked(fg).mockResolvedValueOnce([
      'Dockerfile',
      'Dockerfile.dev',
      'Dockerfile.prod',
    ]);

    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --prod',
    );

    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM node:18\nRUN echo "dev"',
    );

    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --offline --prod\nCOPY . .',
    );

    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm prune --prod',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile.prod',
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm prune --prod\nCOPY . .',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
  });

  it('should skip dockerfiles already using pnpm prune --prod', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'FROM ${BASE_IMAGE} AS build\nRUN pnpm prune --prod',
    );

    await expect(
      tryPatchDockerfilePruneProd({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no dockerfiles to patch',
    } satisfies PatchReturnType);
  });
});
