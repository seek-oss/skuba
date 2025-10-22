import { afterEach, describe, expect, it, vi } from 'vitest';
import fg from 'fast-glob';
import fs from 'fs-extra';

import type { PatchConfig } from '../../index.js';

import { tryPatchDockerComposeFiles } from './patchDockerCompose.js';
vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchDockerComposeFile', () => {
  afterEach(() => vi.resetAllMocks());

  const mockDockerComposeFile = 'docker-compose.yml';
  const mockDockerComposeContents =
    'services:\n' +
    'app:\n' +
    "image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}\n" +
    'init: true\n' +
    'volumes:';
  const mockPatchableDockerComposeContents = `version: '3.8'\n${mockDockerComposeContents}`;

  it('should skip if no Dockerfile is found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no docker-compose files found',
    });
  });
  it('should patch docker-compose files with version field', async () => {
    vi.mocked(fg).mockResolvedValueOnce([mockDockerComposeFile]);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(mockPatchableDockerComposeContents as never);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      'docker-compose.yml',
      'services:\n' +
        'app:\n' +
        "image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}\n" +
        'init: true\n' +
        'volumes:',
    );
  });
  it('should skip if no docker-compose files contain a version field', async () => {
    vi.mocked(fg).mockResolvedValueOnce([mockDockerComposeFile]);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(mockDockerComposeContents as never);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no docker-compose files to patch',
    });
  });
  it('should not remove intended version in docker compose file', async () => {
    vi.mocked(fg).mockResolvedValueOnce([mockDockerComposeFile]);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        `${mockPatchableDockerComposeContents}\n     version: 7\nversion: 0.2` as never,
      );
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      'docker-compose.yml',
      'services:\n' +
        'app:\n' +
        "image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}\n" +
        'init: true\n' +
        'volumes:\n' +
        '     version: 7\n' +
        'version: 0.2',
    );
  });
});
