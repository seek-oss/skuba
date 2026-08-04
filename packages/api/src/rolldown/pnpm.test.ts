import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

import { pathExists } from '../../../../src/utils/fs.js';

import {
  extractDependencies,
  readPackageManagerField,
  stageWorkspaceFiles,
} from './pnpm.js';

describe('readPackageManagerField', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pnpm-meta-'));
  });

  afterEach(() => fs.remove(tmpDir));

  const writeManifest = (manifest: unknown) =>
    fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(manifest),
    );

  it('reads the packageManager pin', async () => {
    await writeManifest({ packageManager: 'pnpm@9.0.0' });

    await expect(readPackageManagerField(tmpDir)).resolves.toBe('pnpm@9.0.0');
  });

  it('returns undefined when there is no package.json', () =>
    expect(readPackageManagerField(tmpDir)).resolves.toBeUndefined());

  it('returns undefined when there is no packageManager field', async () => {
    await writeManifest({ name: 'app' });

    await expect(readPackageManagerField(tmpDir)).resolves.toBeUndefined();
  });

  it('returns undefined when package.json is not an object', async () => {
    await writeManifest([]);

    await expect(readPackageManagerField(tmpDir)).resolves.toBeUndefined();
  });

  it('throws for malformed JSON', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'package.json'), 'not-json{');

    await expect(readPackageManagerField(tmpDir)).rejects.toThrow(
      /Failed to parse/,
    );
  });
});

describe('stageWorkspaceFiles', () => {
  let srcDir: string;
  let destDir: string;

  beforeEach(async () => {
    srcDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ws-src-'));
    destDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ws-dest-'));
  });

  afterEach(async () => {
    await fs.remove(srcDir);
    await fs.remove(destDir);
  });

  const writeWorkspaceYaml = (...lines: string[]) =>
    fs.promises.writeFile(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      lines.join('\n'),
    );

  const writePatch = async (relativePath: string, contents = 'diff') => {
    const dest = path.join(srcDir, relativePath);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, contents);
  };

  const readWorkspaceYaml = async () =>
    parse(
      await fs.promises.readFile(
        path.join(destDir, 'pnpm-workspace.yaml'),
        'utf8',
      ),
    ) as Record<string, unknown>;

  const destHas = (relativePath: string) =>
    pathExists(path.join(destDir, relativePath));

  it('copies pnpm workspace files that exist', async () => {
    await writeWorkspaceYaml('packages: []');
    await fs.promises.writeFile(path.join(srcDir, '.npmrc'), 'registry=...');

    await stageWorkspaceFiles(srcDir, destDir);

    await expect(destHas('pnpm-workspace.yaml')).resolves.toBe(true);
    await expect(destHas('.npmrc')).resolves.toBe(true);
    await expect(destHas('.pnpmfile.cjs')).resolves.toBe(false);
  });

  it('skips files that do not exist in the workspace root', async () => {
    await stageWorkspaceFiles(srcDir, destDir);

    await expect(fs.promises.readdir(destDir)).resolves.toHaveLength(0);
  });

  it('records every path it writes in stagedFiles', async () => {
    await writeWorkspaceYaml('packages: []');
    await fs.promises.writeFile(path.join(srcDir, '.npmrc'), 'registry=...');
    await writePatch('patches/constructs@3.22.4.patch');

    await expect(stageWorkspaceFiles(srcDir, destDir)).resolves.toEqual([
      path.join(destDir, 'pnpm-workspace.yaml'),
      path.join(destDir, '.npmrc'),
      path.join(destDir, 'patches'),
    ]);
  });

  it('records a destination before writing it, so a failed copy can still be stripped', async () => {
    await fs.promises.writeFile(path.join(srcDir, '.npmrc'), 'registry=...');

    const copyFile = vi
      .spyOn(fs.promises, 'copyFile')
      .mockRejectedValue(new Error('EIO'));

    const stagedFiles: string[] = [];
    try {
      await expect(
        stageWorkspaceFiles(srcDir, destDir, stagedFiles),
      ).rejects.toThrow('EIO');

      expect(stagedFiles).toContain(path.join(destDir, '.npmrc'));
    } finally {
      copyFile.mockRestore();
    }
  });

  it('preserves comments when forcing allowUnusedPatches', async () => {
    await writeWorkspaceYaml('# keep me', 'packages: []');

    await stageWorkspaceFiles(srcDir, destDir);

    const staged = await fs.promises.readFile(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(staged).toContain('# keep me');
    expect(staged).toContain('allowUnusedPatches: true');
  });

  it('forces allowUnusedPatches on, as the output installs a subset of the workspace', async () => {
    await writeWorkspaceYaml(
      'packages: []',
      'patchedDependencies:',
      '  "constructs@3.22.4": patches/constructs@3.22.4.patch',
    );
    await writePatch('patches/constructs@3.22.4.patch');

    await stageWorkspaceFiles(srcDir, destDir);

    await expect(readWorkspaceYaml()).resolves.toMatchObject({
      allowUnusedPatches: true,
      patchedDependencies: {
        'constructs@3.22.4': 'patches/constructs@3.22.4.patch',
      },
    });
  });

  it('overrides a workspace allowUnusedPatches: false', async () => {
    await writeWorkspaceYaml('allowUnusedPatches: false');

    await stageWorkspaceFiles(srcDir, destDir);

    await expect(readWorkspaceYaml()).resolves.toMatchObject({
      allowUnusedPatches: true,
    });
  });

  it('copies the patches directory across, preserving relative paths', async () => {
    await writeWorkspaceYaml(
      'patchedDependencies:',
      '  "constructs@3.22.4": patches/constructs@3.22.4.patch',
    );
    await writePatch('patches/constructs@3.22.4.patch', 'diff --constructs');
    await writePatch('patches/@changesets__cli@2.31.0.patch', 'diff --cs');

    await stageWorkspaceFiles(srcDir, destDir);

    await expect(
      fs.promises.readFile(
        path.join(destDir, 'patches/constructs@3.22.4.patch'),
        'utf8',
      ),
    ).resolves.toBe('diff --constructs');
    await expect(
      destHas('patches/@changesets__cli@2.31.0.patch'),
    ).resolves.toBe(true);
  });

  it('leaves an empty workspace yaml alone', async () => {
    await writeWorkspaceYaml('');

    await stageWorkspaceFiles(srcDir, destDir);

    await expect(
      fs.promises.readFile(path.join(destDir, 'pnpm-workspace.yaml'), 'utf8'),
    ).resolves.toBe('');
  });

  it('throws a clear error when pnpm-workspace.yaml is not valid yaml', async () => {
    await writeWorkspaceYaml(
      'patchedDependencies:',
      '  not-a-valid-entry',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
    );

    await expect(stageWorkspaceFiles(srcDir, destDir)).rejects.toThrow(
      /Failed to parse pnpm-workspace\.yaml/,
    );
  });
});

describe('extractDependencies', () => {
  let tmpDir: string;
  let tmpPkgPath: string;

  const installModule = async (name: string, pkgJson: unknown) => {
    const modDir = path.join(tmpDir, 'node_modules', ...name.split('/'));
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(modDir, 'package.json'),
      JSON.stringify(pkgJson),
    );
  };

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'extract-deps-'));
    tmpPkgPath = path.join(tmpDir, 'package.json');
    await fs.promises.writeFile(
      tmpPkgPath,
      JSON.stringify({ dependencies: {} }),
    );
  });

  afterEach(() => fs.remove(tmpDir));

  it('resolves the concrete installed version', async () => {
    await installModule('pino', { name: 'pino', version: '9.5.0' });

    await expect(extractDependencies(tmpPkgPath, ['pino'])).resolves.toEqual({
      pino: '9.5.0',
    });
  });

  it('resolves versions for multiple modules', async () => {
    await installModule('pino', { name: 'pino', version: '9.5.0' });
    await installModule('lodash', { name: 'lodash', version: '4.17.21' });

    await expect(
      extractDependencies(tmpPkgPath, ['pino', 'lodash']),
    ).resolves.toEqual({ pino: '9.5.0', lodash: '4.17.21' });
  });

  it('returns an empty record for no modules', () =>
    expect(extractDependencies(tmpPkgPath, [])).resolves.toEqual({}));

  it('throws when a module cannot be resolved', () =>
    expect(
      extractDependencies(tmpPkgPath, ['__nonexistent_module__']),
    ).rejects.toThrow(/Cannot extract version for module/));

  it('throws when the resolved version is not a string', async () => {
    await installModule('fake-non-string-ver', { version: 42 });

    await expect(
      extractDependencies(tmpPkgPath, ['fake-non-string-ver']),
    ).rejects.toThrow(/Cannot extract version for module/);
  });

  it('throws when the resolved version is an empty string', async () => {
    await installModule('fake-empty-ver', {
      name: 'fake-empty-ver',
      version: '  ',
    });

    await expect(
      extractDependencies(tmpPkgPath, ['fake-empty-ver']),
    ).rejects.toThrow(/Cannot extract version for module/);
  });
});
