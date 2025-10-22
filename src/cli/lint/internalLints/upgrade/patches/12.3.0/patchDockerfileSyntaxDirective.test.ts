import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchDockerfileSyntaxDirective', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no dockerfiles found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no dockerfiles found',
    });
  });

  it('should skip if dockerfiles do not contain the Dockerfile syntax directive', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      'No Dockerfile syntax directive here' as never,
    );
    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no dockerfiles to patch',
    });
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\n' as never,
    );

    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should patch dockerfiles if mode is format', async () => {
    vi.mocked(fg).mockResolvedValueOnce([
      'Dockerfile',
      'Dockerfile.dev-deps',
      'Dockerfile.build',
    ]);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\nFROM node:22' as never,
    );
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\nFROM python:3.9' as never,
    );
    vi.mocked(fs.readFile).mockResolvedValueOnce('FROM python:3.9' as never);

    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM node:22',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'Dockerfile.dev-deps',
      'FROM python:3.9',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });
});
