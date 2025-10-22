import { afterEach, describe, expect, it, vi } from 'vitest';
import fg from 'fast-glob';
import fs from 'fs-extra';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchDockerfileCIVariable } from './patchDockerfileCIVariable.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchDockerfileCIVariable', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no dockerfiles found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no dockerfiles found',
    });
  });

  it('should skip if dockerfiles do not contain pnpm install --prod commands', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('FROM node:18\nRUN npm install' as never);
    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no dockerfiles to patch',
    });
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should patch dockerfiles with CI variable if mode is format', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --prod',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should patch multiple dockerfiles containing pnpm install --prod commands', async () => {
    vi.mocked(fg)
      .mockResolvedValueOnce([
        'Dockerfile',
        'Dockerfile.dev',
        'Dockerfile.prod',
      ]);

    // First dockerfile has the target command
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod' as never,
      );

    // Second dockerfile doesn't have the target command
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('FROM node:18\nRUN echo "dev"' as never);

    // Third dockerfile has the target command
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --offline --prod\nCOPY . .' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --prod',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile.prod',
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --offline --prod\nCOPY . .',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });

  it('should handle dockerfiles with complex content', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    const complexDockerfile = `# Multi-stage build
FROM node:18 AS deps
WORKDIR /app
COPY package*.json ./
RUN pnpm install --prod

FROM \${BASE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
CMD ["npm", "start"]`;

    vi.mocked(fs.readFile).mockResolvedValueOnce(complexDockerfile as never);

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const expectedContent = `# Multi-stage build
FROM node:18 AS deps
WORKDIR /app
COPY package*.json ./
RUN CI=true pnpm install --prod

FROM \${BASE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
CMD ["npm", "start"]`;

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      expectedContent,
      'utf8',
    );
  });

  it('should patch dockerfiles with pnpm install --prod commands', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN pnpm install --prod' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN CI=true pnpm install --prod',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should detect pnpm install --prod commands in lint mode', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN pnpm install --prod' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should handle mixed variants in multiple dockerfiles', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile', 'Dockerfile.prod']);

    // First dockerfile has basic pnpm install --prod
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN pnpm install --prod' as never,
      );

    // Second dockerfile has pnpm install with additional flags including --prod
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN pnpm install --offline --prod' as never,
      );

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\nRUN CI=true pnpm install --prod',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile.prod',
      'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN CI=true pnpm install --offline --prod',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });
});
