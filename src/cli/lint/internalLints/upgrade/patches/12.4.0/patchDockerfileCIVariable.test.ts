import fg from 'fast-glob';
import fs from 'fs-extra';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchDockerfileCIVariable } from './patchDockerfileCIVariable.js';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchDockerfileCIVariable', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if no dockerfiles found', async () => {
    jest.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no dockerfiles found',
    });
  });

  it('should skip if dockerfiles do not contain the target FROM line', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce('FROM node:18\nRUN echo "hello"' as never);
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
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN echo "test"' as never,
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
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN npm install' as never,
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
      'FROM ${BASE_IMAGE} AS build\n\nENV CI=true\n\nRUN npm install',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should patch multiple dockerfiles containing the target FROM line', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce([
        'Dockerfile',
        'Dockerfile.dev',
        'Dockerfile.prod',
      ]);

    // First dockerfile has the target line
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN npm ci' as never,
      );

    // Second dockerfile doesn't have the target line
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce('FROM node:18\nRUN echo "dev"' as never);

    // Third dockerfile has the target line
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce('FROM ${BASE_IMAGE} AS build\nCOPY . .' as never);

    await expect(
      tryPatchDockerfileCIVariable({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM ${BASE_IMAGE} AS build\n\nENV CI=true\n\nRUN npm ci',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile.prod',
      'FROM ${BASE_IMAGE} AS build\n\nENV CI=true\n\nCOPY . .',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });

  it('should handle dockerfiles with complex content', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    const complexDockerfile = `# Multi-stage build
FROM node:18 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM \${BASE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
CMD ["npm", "start"]`;

    jest.mocked(fs.readFile).mockResolvedValueOnce(complexDockerfile as never);

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
RUN npm ci

FROM \${BASE_IMAGE} AS build

ENV CI=true

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

  it('should patch dockerfiles with BASE_TAG variant', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN npm install' as never,
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
      'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\n\nENV CI=true\n\nRUN npm install',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should detect BASE_TAG variant in lint mode', async () => {
    jest.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nRUN echo "test"' as never,
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
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile', 'Dockerfile.prod']);

    // First dockerfile has the original variant
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE} AS build\nRUN npm ci' as never,
      );

    // Second dockerfile has the BASE_TAG variant
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
        'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\nCOPY . .' as never,
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
      'FROM ${BASE_IMAGE} AS build\n\nENV CI=true\n\nRUN npm ci',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile.prod',
      'FROM ${BASE_IMAGE}:${BASE_TAG} AS build\n\nENV CI=true\n\nCOPY . .',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });
});
