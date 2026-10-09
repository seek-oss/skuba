import crypto from 'crypto';
import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getExistingRepoDefaults } from './existingRepo.js';

const TEMP_ROOT = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'integration',
  'init-existing-repo',
);

const writeWorkspace = async ({
  files,
  remoteUrl,
}: {
  files: Record<string, string>;
  remoteUrl?: string;
}): Promise<string> => {
  const workspaceRoot = path.join(
    TEMP_ROOT,
    `case-${crypto.randomUUID()}`,
    'my-repo',
  );

  await fs.ensureDir(workspaceRoot);

  await Promise.all(
    Object.entries(files).map(async ([filepath, contents]) => {
      const target = path.join(workspaceRoot, filepath);
      await fs.ensureDir(path.dirname(target));
      await fs.promises.writeFile(target, contents);
    }),
  );

  await git.init({ dir: workspaceRoot, fs });

  if (remoteUrl) {
    await git.addRemote({
      dir: workspaceRoot,
      fs,
      remote: 'origin',
      url: remoteUrl,
    });
  }

  return workspaceRoot;
};

beforeEach(() => {
  // `getOwnerAndRepo` prefers CI environment variables over local remotes.
  vi.stubEnv('BUILDKITE_REPO', undefined);
  vi.stubEnv('GITHUB_REPOSITORY', undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.remove(TEMP_ROOT);
});

describe('getExistingRepoDefaults', () => {
  it('reads the owner and repo name from the Git remote', async () => {
    const workspaceRoot = await writeWorkspace({
      files: { 'pnpm-workspace.yaml': 'packages:\n  - packages/*\n' },
      remoteUrl: 'git@github.com:my-org/indie-rita-ora.git',
    });

    await expect(
      getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
    ).resolves.toEqual({
      workspaceRoot,
      ownerName: 'my-org',
      repoName: 'indie-rita-ora',
      parentDir: 'packages',
    });
  });

  it('prefers an org/team owner from CODEOWNERS over the remote org', async () => {
    const workspaceRoot = await writeWorkspace({
      files: {
        'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
        '.github/CODEOWNERS': '* @my-org/my-team\n',
      },
      remoteUrl: 'git@github.com:my-org/indie-rita-ora.git',
    });

    await expect(
      getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
    ).resolves.toMatchObject({ ownerName: 'my-org/my-team' });
  });

  it('ignores a CODEOWNERS entry that is not a GitHub team', async () => {
    const workspaceRoot = await writeWorkspace({
      files: {
        'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
        '.github/CODEOWNERS': '* someone@example.com\n',
      },
      remoteUrl: 'git@github.com:my-org/indie-rita-ora.git',
    });

    await expect(
      getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
    ).resolves.toMatchObject({ ownerName: 'my-org' });
  });

  it('falls back to the workspace root directory name without a remote', async () => {
    const workspaceRoot = await writeWorkspace({
      files: { 'pnpm-workspace.yaml': 'packages:\n  - packages/*\n' },
    });

    await expect(
      getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
    ).resolves.toMatchObject({
      ownerName: undefined,
      repoName: 'my-repo',
    });
  });

  describe('parentDir', () => {
    it('suggests the first directory glob in pnpm-workspace.yaml', async () => {
      const workspaceRoot = await writeWorkspace({
        files: {
          'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - packages/*\n',
        },
      });

      await expect(
        getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
      ).resolves.toMatchObject({ parentDir: 'apps' });
    });

    it('skips globs that are not a plain directory wildcard', async () => {
      const workspaceRoot = await writeWorkspace({
        files: {
          'pnpm-workspace.yaml':
            "packages:\n  - '!packages/legacy'\n  - standalone\n  - services/**\n",
        },
      });

      await expect(
        getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
      ).resolves.toMatchObject({ parentDir: 'services' });
    });

    it('prefers the current working directory inside the workspace', async () => {
      const workspaceRoot = await writeWorkspace({
        files: { 'pnpm-workspace.yaml': 'packages:\n  - apps/*\n' },
      });

      const cwd = path.join(workspaceRoot, 'packages', 'nested');
      await fs.ensureDir(cwd);

      await expect(
        getExistingRepoDefaults({ workspaceRoot, cwd }),
      ).resolves.toMatchObject({ parentDir: 'packages/nested' });
    });

    it('ignores a current working directory outside the workspace', async () => {
      const workspaceRoot = await writeWorkspace({
        files: { 'pnpm-workspace.yaml': 'packages:\n  - apps/*\n' },
      });

      await expect(
        getExistingRepoDefaults({
          workspaceRoot,
          cwd: path.dirname(workspaceRoot),
        }),
      ).resolves.toMatchObject({ parentDir: 'apps' });
    });

    it('is empty when no glob suggests a directory', async () => {
      const workspaceRoot = await writeWorkspace({
        files: {
          'pnpm-workspace.yaml': 'onlyBuiltDependencies:\n  - esbuild\n',
        },
      });

      await expect(
        getExistingRepoDefaults({ workspaceRoot, cwd: workspaceRoot }),
      ).resolves.toMatchObject({ parentDir: '' });
    });
  });
});
