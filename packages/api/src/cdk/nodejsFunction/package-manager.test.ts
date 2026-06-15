import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  copyWorkspaceFiles,
  readPackageManagerMeta,
} from './package-manager.js';

describe('readPackageManagerMeta', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads packageManager field', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@9.0.0' }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBe('pnpm@9.0.0');
    expect(meta.nearestPackageJson).toBe(path.join(tmpDir, 'package.json'));
  });

  it.each(['npm@10.0.0', 'yarn@4.0.0', 'bun@1.0.0'])(
    'throws for a non-pnpm packageManager field %p',
    (packageManager) => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ packageManager }),
      );
      expect(() => readPackageManagerMeta(tmpDir)).toThrow(
        /only supports pnpm/,
      );
    },
  );

  it('returns undefined packageManagerField when packageManager has no version', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm' }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBeUndefined();
  });

  it('validates pnpm from devEngines', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devEngines: { packageManager: { name: 'pnpm', version: '9.0.0' } },
      }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBeUndefined();
    expect(meta.nearestPackageJson).toBe(path.join(tmpDir, 'package.json'));
  });

  it('validates pnpm from devEngines without version', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ devEngines: { packageManager: { name: 'pnpm' } } }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBeUndefined();
  });

  it('throws for a non-pnpm devEngines entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devEngines: { packageManager: { name: 'yarn', version: '4.0.0' } },
      }),
    );
    expect(() => readPackageManagerMeta(tmpDir)).toThrow(/only supports pnpm/);
  });

  it('returns undefined fields when no package.json exists', () => {
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.nearestPackageJson).toBeUndefined();
    expect(meta.packageManagerField).toBeUndefined();
  });

  it('returns undefined packageManagerField when package.json contains non-object JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify([]));
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBeUndefined();
  });

  it('falls through to packageManager field when devEngines.packageManager is not a record', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        packageManager: 'pnpm@9.1.0',
        devEngines: { packageManager: 'pnpm' },
      }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBe('pnpm@9.1.0');
  });

  it('forwards the packageManager pin even when devEngines also validates pnpm', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        packageManager: 'pnpm@8.0.0',
        devEngines: { packageManager: { name: 'pnpm', version: '9.0.0' } },
      }),
    );
    const meta = readPackageManagerMeta(tmpDir);
    expect(meta.packageManagerField).toBe('pnpm@8.0.0');
  });
});

describe('copyWorkspaceFiles', () => {
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-src-'));
    destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-dest-'));
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  it('copies pnpm workspace files that exist', () => {
    fs.writeFileSync(path.join(srcDir, 'pnpm-workspace.yaml'), 'packages: []');
    fs.writeFileSync(path.join(srcDir, '.npmrc'), 'registry=...');

    copyWorkspaceFiles(srcDir, destDir);

    expect(fs.existsSync(path.join(destDir, 'pnpm-workspace.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, '.npmrc'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, '.pnpmfile.cjs'))).toBe(false);
  });

  it('injects ignore-scripts=true into .npmrc when ignoreScripts is set', () => {
    copyWorkspaceFiles(srcDir, destDir, [], true);
    const npmrc = fs.readFileSync(path.join(destDir, '.npmrc'), 'utf8');
    expect(npmrc).toContain('ignore-scripts=true');
  });

  it('appends ignore-scripts to an existing .npmrc without a trailing newline', () => {
    fs.writeFileSync(
      path.join(srcDir, '.npmrc'),
      'registry=https://example.test',
    );
    copyWorkspaceFiles(srcDir, destDir, [], true);
    const npmrc = fs.readFileSync(path.join(destDir, '.npmrc'), 'utf8');
    expect(npmrc).toContain('registry=https://example.test');
    expect(npmrc).toContain('\nignore-scripts=true');
  });

  it('does not duplicate ignore-scripts when already present', () => {
    fs.writeFileSync(path.join(srcDir, '.npmrc'), 'ignore-scripts=true\n');
    copyWorkspaceFiles(srcDir, destDir, [], true);
    const npmrc = fs.readFileSync(path.join(destDir, '.npmrc'), 'utf8');
    expect(npmrc.match(/ignore-scripts=true/g)).toHaveLength(1);
  });

  it('does not inject ignore-scripts by default', () => {
    copyWorkspaceFiles(srcDir, destDir);
    expect(fs.existsSync(path.join(destDir, '.npmrc'))).toBe(false);
  });

  it('skips files that do not exist in projectRoot', () => {
    copyWorkspaceFiles(srcDir, destDir);
    expect(fs.readdirSync(destDir)).toHaveLength(0);
  });

  it('throws when a pnpm patch path escapes the project/output directory', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "constructs@3.22.4": ../../escape.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    expect(() => copyWorkspaceFiles(srcDir, destDir, ['constructs'])).toThrow(
      /resolves outside/,
    );
  });

  it('throws when a pnpm patch path is a symlink that escapes the project root', () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-outside-'));
    try {
      fs.writeFileSync(path.join(outsideDir, 'evil.patch'), 'diff');
      fs.mkdirSync(path.join(srcDir, 'patches'));
      fs.symlinkSync(
        path.join(outsideDir, 'evil.patch'),
        path.join(srcDir, 'patches/constructs.patch'),
      );

      const workspaceContent = [
        'packages: []',
        'patchedDependencies:',
        '  "constructs@3.22.4": patches/constructs.patch',
      ].join('\n');
      fs.writeFileSync(
        path.join(srcDir, 'pnpm-workspace.yaml'),
        workspaceContent,
      );

      expect(() => copyWorkspaceFiles(srcDir, destDir, ['constructs'])).toThrow(
        /via symlink/,
      );
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('strips patchedDependencies entries for packages not in nodeModules', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(
      path.join(srcDir, 'patches/@changesets__cli@2.31.0.patch'),
      'diff',
    );

    copyWorkspaceFiles(srcDir, destDir, ['constructs']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).not.toContain('patchedDependencies');
    expect(fs.existsSync(path.join(destDir, 'patches'))).toBe(false);
  });

  it('throws a clear error when pnpm-workspace.yaml is not valid yaml', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  not-a-valid-entry',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    expect(() => copyWorkspaceFiles(srcDir, destDir, ['constructs'])).toThrow(
      /Failed to parse pnpm-workspace\.yaml/,
    );
  });

  it('skips copying a patch file that does not exist on disk', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "constructs@3.22.4": patches/constructs@3.22.4.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, ['constructs']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('constructs@3.22.4');
    expect(
      fs.existsSync(path.join(destDir, 'patches/constructs@3.22.4.patch')),
    ).toBe(false);
  });

  it('preserves patchedDependencies entries for packages in nodeModules and copies their patch files', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "constructs@3.22.4": patches/constructs@3.22.4.patch',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(
      path.join(srcDir, 'patches/constructs@3.22.4.patch'),
      'diff --constructs',
    );
    fs.writeFileSync(
      path.join(srcDir, 'patches/@changesets__cli@2.31.0.patch'),
      'diff --cs',
    );

    copyWorkspaceFiles(srcDir, destDir, ['constructs']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('patchedDependencies');
    expect(written).toContain('constructs@3.22.4');
    expect(written).not.toContain('@changesets/cli@2.31.0');
    expect(
      fs.existsSync(path.join(destDir, 'patches/constructs@3.22.4.patch')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(destDir, 'patches/@changesets__cli@2.31.0.patch'),
      ),
    ).toBe(false);
  });

  it('strips the version from a patch key whose version is not digit-leading', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      "  'foo@^1.2.3': patches/foo.patch",
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(path.join(srcDir, 'patches/foo.patch'), 'diff');

    copyWorkspaceFiles(srcDir, destDir, ['foo']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('foo@^1.2.3');
    expect(fs.existsSync(path.join(destDir, 'patches/foo.patch'))).toBe(true);
  });

  it('strips the version from a scoped patch key whose version is not digit-leading', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      "  '@scope/pkg@^1.2.3': patches/scope.patch",
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(path.join(srcDir, 'patches/scope.patch'), 'diff');

    copyWorkspaceFiles(srcDir, destDir, ['@scope/pkg']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('@scope/pkg@^1.2.3');
    expect(fs.existsSync(path.join(destDir, 'patches/scope.patch'))).toBe(true);
  });

  it('parses the package name from a key with a npm-alias version selector', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      "  'foo@npm:bar@1.0.0': patches/foo.patch",
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(path.join(srcDir, 'patches/foo.patch'), 'diff');

    copyWorkspaceFiles(srcDir, destDir, ['foo']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('foo@npm:bar@1.0.0');
    expect(fs.existsSync(path.join(destDir, 'patches/foo.patch'))).toBe(true);
  });

  it('strips patchedDependencies section when yaml ends with a trailing newline', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
      '',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, []);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).not.toContain('patchedDependencies');
  });

  it('strips patchedDependencies section when followed by another yaml key', () => {
    const workspaceContent = [
      'patchedDependencies:',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
      'other: value',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, []);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).not.toContain('patchedDependencies');
    expect(written).toContain('other: value');
  });

  it('handles a patchedDependencies entry with a null key', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  : patches/foo.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, []);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).not.toContain('patchedDependencies');
  });

  it('strips the deleted entry newline when it precedes a kept entry', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "@changesets/cli@2.31.0": patches/@changesets__cli@2.31.0.patch',
      '  "constructs@3.22.4": patches/constructs@3.22.4.patch',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );
    fs.mkdirSync(path.join(srcDir, 'patches'));
    fs.writeFileSync(
      path.join(srcDir, 'patches/constructs@3.22.4.patch'),
      'diff',
    );

    copyWorkspaceFiles(srcDir, destDir, ['constructs']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('constructs@3.22.4');
    expect(written).not.toContain('@changesets/cli@2.31.0');
  });

  it('preserves a patchedDependencies entry whose value is absent', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      '  "constructs@3.22.4":',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, ['constructs']);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).toContain('constructs@3.22.4');
  });

  it('strips patchedDependencies when its value block is absent', () => {
    const workspaceContent = [
      'packages: []',
      'patchedDependencies:',
      'other: value',
    ].join('\n');
    fs.writeFileSync(
      path.join(srcDir, 'pnpm-workspace.yaml'),
      workspaceContent,
    );

    copyWorkspaceFiles(srcDir, destDir, []);

    const written = fs.readFileSync(
      path.join(destDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    expect(written).not.toContain('patchedDependencies');
    expect(written).toContain('other: value');
  });
});
