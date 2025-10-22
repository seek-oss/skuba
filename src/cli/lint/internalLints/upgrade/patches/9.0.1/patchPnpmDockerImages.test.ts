import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig } from '../../index.js';

import { tryPatchPnpmDockerImages } from './patchPnpmDockerImages.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchPnpmDockerImages', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no Dockerfiles found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
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
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(`beep` as never);

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN pnpm config set store-dir /root/.pnpm-store` as never,
    );

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should patch Dockerfiles', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
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

    expect(fs.writeFile).toHaveBeenNthCalledWith(
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

  it('should patch Dockerfiles with different indents', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN pnpm config set store-dir /root/.pnpm-store

RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
  --mount=type=bind,source=patches,target=patches \\
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

    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN --mount=type=bind,source=package.json,target=package.json \\
    pnpm config set store-dir /root/.pnpm-store

RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
  --mount=type=bind,source=package.json,target=package.json \\
  --mount=type=bind,source=patches,target=patches \\
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
  --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
  pnpm fetch
`,
    );
  });

  it('should patch Dockerfiles with extra mounts', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=patches,target=patches \\
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

    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=patches,target=patches \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm fetch
`,
    );
  });

  it('should fix Dockerfiles with only the config store line to fix', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `# syntax=docker/dockerfile:1.10

FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN pnpm config set store-dir /root/.pnpm-store
` as never,
    );

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `# syntax=docker/dockerfile:1.10

FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \\
    corepack enable pnpm && corepack install

RUN --mount=type=bind,source=package.json,target=package.json \\
    pnpm config set store-dir /root/.pnpm-store
`,
    );
  });

  it('should fix Dockerfiles with only pnpm fetch to fix', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
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

    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm fetch
`,
    );
  });

  it('should fix Dockerfiles with an alternative pnpm install syntax', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm install
` as never,
    );

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      `RUN --mount=type=bind,source=.npmrc,target=.npmrc \\
    --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \\
    pnpm install
`,
    );
  });

  it('should not try to patch already patched Dockerfiles', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
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
` as never,
    );

    await expect(
      tryPatchPnpmDockerImages({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });
  });
});
