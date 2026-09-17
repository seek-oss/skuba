import crypto from 'crypto';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import { registerWorkspaceProject } from './workspace.js';

const TEMP_ROOT = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'integration',
  'init-workspace',
);

let tempDir: string;

const writeWorkspace = async (
  files: Record<string, string>,
): Promise<string> => {
  tempDir = path.join(TEMP_ROOT, `case-${crypto.randomUUID()}`);
  await fs.ensureDir(tempDir);

  await Promise.all(
    Object.entries(files).map(async ([filepath, contents]) => {
      const target = path.join(tempDir, filepath);
      await fs.ensureDir(path.dirname(target));
      await fs.promises.writeFile(target, contents);
    }),
  );

  return tempDir;
};

afterEach(async () => {
  await fs.remove(TEMP_ROOT);
});

describe('registerWorkspaceProject', () => {
  describe('pnpm', () => {
    it('is a no-op when an existing glob already covers the project', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'packages', 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'already-covered',
        entry: 'packages/my-api',
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe('packages:\n  - packages/*\n');
    });

    it('appends an uncovered project and preserves other content', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': `packages:
  # a comment
  - packages/*

onlyBuiltDependencies:
  - esbuild
`,
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'registered',
        entry: 'my-api',
        file: path.join(workspaceRoot, 'pnpm-workspace.yaml'),
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe(`packages:
  # a comment
  - my-api
  - packages/*

onlyBuiltDependencies:
  - esbuild
`);
    });

    it('registers an application (e.g. a Lambda worker) the same as a package', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'workers', 'notification-worker'),
      });

      expect(result).toEqual({
        outcome: 'registered',
        entry: 'workers/notification-worker',
        file: path.join(workspaceRoot, 'pnpm-workspace.yaml'),
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe(
        'packages:\n  - workers/notification-worker\n  - packages/*\n',
      );
    });

    it('appends into an inline flow sequence rather than emitting a block item', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': "packages: ['packages/*']\n",
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'registered',
        entry: 'my-api',
        file: path.join(workspaceRoot, 'pnpm-workspace.yaml'),
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe("packages: ['packages/*', 'my-api']\n");
    });

    it('appends into an inline flow sequence with a trailing comment', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': "packages: ['packages/*'] # workspaces\n",
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toMatchObject({ outcome: 'registered', entry: 'my-api' });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe("packages: ['packages/*', 'my-api'] # workspaces\n");
    });

    it('reads block items across an interleaved top-level comment', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': `packages:
  - packages/*
# apps live here too
  - apps/*
`,
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'apps', 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'already-covered',
        entry: 'apps/my-api',
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe(`packages:
  - packages/*
# apps live here too
  - apps/*
`);
    });

    it('does not treat a negation glob as covering the project', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': "packages:\n  - '!packages/legacy'\n",
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toMatchObject({ outcome: 'registered', entry: 'my-api' });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe("packages:\n  - my-api\n  - '!packages/legacy'\n");
    });

    it('is a no-op when an inline flow sequence already covers the project', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': "packages: ['packages/*']\n",
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'packages', 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'already-covered',
        entry: 'packages/my-api',
      });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe("packages: ['packages/*']\n");
    });

    it('appends into an empty inline flow sequence', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': 'packages: []\n',
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toMatchObject({ outcome: 'registered', entry: 'my-api' });

      await expect(
        fs.promises.readFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'utf8',
        ),
      ).resolves.toBe("packages: ['my-api']\n");
    });

    it('returns a manual result when there is no pnpm-workspace.yaml', async () => {
      const workspaceRoot = await writeWorkspace({ 'package.json': '{}\n' });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'manual',
        entry: 'my-api',
        reason: 'no pnpm-workspace.yaml found at the workspace root',
      });
    });

    it('returns a manual result when there is no packages: section', async () => {
      const workspaceRoot = await writeWorkspace({
        'pnpm-workspace.yaml': 'onlyBuiltDependencies:\n  - esbuild\n',
      });

      const result = await registerWorkspaceProject({
        workspaceRoot,
        projectDir: path.join(workspaceRoot, 'my-api'),
      });

      expect(result).toEqual({
        outcome: 'manual',
        entry: 'my-api',
        reason: 'could not find a packages: section in pnpm-workspace.yaml',
      });
    });
  });

  it('returns a manual result when the project is outside the workspace root', async () => {
    const workspaceRoot = await writeWorkspace({
      'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
    });

    const result = await registerWorkspaceProject({
      workspaceRoot: path.join(workspaceRoot, 'nested'),
      projectDir: workspaceRoot,
    });

    expect(result.outcome).toBe('manual');
  });
});
