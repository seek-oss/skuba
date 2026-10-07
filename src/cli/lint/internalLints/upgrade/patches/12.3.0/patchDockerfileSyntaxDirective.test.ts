import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { globFiles } from '../../../../../../utils/glob.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.js';

vi.mock('fs-extra');
vi.mock('../../../../../../utils/glob.js');

describe('patchDockerfileSyntaxDirective', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no dockerfiles found', async () => {
    vi.mocked(globFiles).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no dockerfiles found',
    } satisfies PatchReturnType);
  });

  it('should skip if dockerfiles do not contain the Dockerfile syntax directive', async () => {
    vi.mocked(globFiles).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      'No Dockerfile syntax directive here',
    );
    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(globFiles).mockResolvedValueOnce(['Dockerfile']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\n',
    );

    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it('should patch dockerfiles if mode is format', async () => {
    vi.mocked(globFiles).mockResolvedValueOnce(['Dockerfile', 'Dockerfile.dev-deps', 'Dockerfile.build']);
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\nFROM node:22',
    );
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
      '# syntax=docker/dockerfile:1.18\nFROM python:3.9',
    );
    vi.mocked(fs.promises.readFile).mockResolvedValueOnce('FROM python:3.9');

    await expect(
      tryPatchDockerfileSyntaxDirective({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile',
      'FROM node:22',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      'Dockerfile.dev-deps',
      'FROM python:3.9',
      'utf8',
    );
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
  });
});
