import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchConfig } from '../..';

import { tryPatchDockerComposeFiles } from './patchDockerCompose';
jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchDockerComposeFile', () => {
  afterEach(() => jest.resetAllMocks());

  const mockDockerComposeFile = 'docker-compose.yml';
  const mockDockerComposeContents =
    'services:\n' +
    'app:\n' +
    "image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}\n" +
    'init: true\n' +
    'volumes:';
  const mockPatchableDockerComposeContents = `version: '3.8'\n${mockDockerComposeContents}`;

  it('should skip if no Dockerfile is found', async () => {
    jest.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no docker-compose files found',
    });
  });
  it('should patch docker-compose files with version field', async () => {
    jest.mocked(fg).mockResolvedValueOnce([mockDockerComposeFile]);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(mockPatchableDockerComposeContents as never);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });
    expect(writeFile).toHaveBeenCalledWith(
      'docker-compose.yml',
      'services:\n' +
        'app:\n' +
        "image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}\n" +
        'init: true\n' +
        'volumes:',
    );
  });
  it('should skip if no docker-compose files contain a version field', async () => {
    jest.mocked(fg).mockResolvedValueOnce([mockDockerComposeFile]);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(mockDockerComposeContents as never);
    await expect(
      tryPatchDockerComposeFiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no docker-compose files to patch',
    });
  });
});
