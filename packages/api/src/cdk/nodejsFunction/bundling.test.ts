import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Bundling,
  type BundlingProps,
  removeEmptyParentDirs,
} from './bundling.js';
import { ValidationError } from './errors.js';

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return { ...original, spawnSync: vi.fn<typeof original.spawnSync>() };
});

const spawnSyncMock = vi.mocked(spawnSync);

const makeSuccessResult = () => ({
  status: 0,
  error: undefined,
  pid: 1,
  output: [],
  stdout: '',
  stderr: '',
  signal: null,
});

const makeErrorResult = (status: number) => ({
  status,
  error: undefined,
  pid: 1,
  output: [],
  stdout: '',
  stderr: '',
  signal: null,
});

const makeSpawnError = (err: Error) => ({
  status: null,
  error: err,
  pid: 1,
  output: [],
  stdout: '',
  stderr: '',
  signal: null,
});

const makeStderrResult = (
  status: number,
  stderr: unknown,
): ReturnType<typeof spawnSync> =>
  ({
    status,
    error: undefined,
    pid: 1,
    output: [],
    stdout: '',
    stderr,
    signal: null,
  }) as unknown as ReturnType<typeof spawnSync>;

let tmpDir: string;
let entryFile: string;
let pkgJsonPath: string;

const installModule = (name: string, version: string) => {
  const modDir = path.join(tmpDir, 'node_modules', ...name.split('/'));
  fs.mkdirSync(modDir, { recursive: true });
  fs.writeFileSync(
    path.join(modDir, 'package.json'),
    JSON.stringify({ name, version }),
  );
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundling-test-'));
  entryFile = path.join(tmpDir, 'handler.ts');
  pkgJsonPath = path.join(tmpDir, 'package.json');
  fs.writeFileSync(entryFile, 'export const handler = () => {};');
  fs.writeFileSync(
    pkgJsonPath,
    JSON.stringify({ dependencies: { pino: '^9' } }),
  );
  // extractDependencies resolves the concrete installed version via
  // findPackageJSON, so pino must be resolvable from tmpDir's node_modules.
  installModule('pino', '9.5.0');
  fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');

  spawnSyncMock.mockReturnValue(makeSuccessResult());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });

  vi.resetAllMocks();
});

const makeProps = (overrides: Partial<BundlingProps> = {}): BundlingProps => ({
  bundlerConfig: path.join(tmpDir, 'build.mjs'),
  entry: entryFile,
  depsLockFilePath: path.join(tmpDir, 'pnpm-lock.yaml'),
  projectRoot: tmpDir,
  ...overrides,
});

describe('Bundling.bundle', () => {
  it('returns an AssetCode', () => {
    const code = Bundling.bundle(makeProps());
    expect(code).toBeDefined();
  });
});

describe('Bundling.local.tryBundle', () => {
  it('spawns a node bridge script with the bundler config embedded', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      bundling.local.tryBundle(outputDir, bundling);

      const bridgeCall = spawnSyncMock.mock.calls.find((c) => c[0] === 'node');
      expect(bridgeCall).toBeDefined();

      const args = bridgeCall![1] as string[];

      expect(args[0]).toMatch(/rolldown\.mjs$/);
      expect(args[1]).toBe(path.join(tmpDir, 'build.mjs'));
      expect(args[2]).toBe(entryFile);
      expect(args[3]).toBe(outputDir);
      expect((bridgeCall![2] as { cwd?: string }).cwd).toBe(tmpDir);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('throws ValidationError when bundler exits non-zero', () => {
    spawnSyncMock.mockReturnValueOnce(makeErrorResult(1));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rethrows spawn errors from the bundler', () => {
    spawnSyncMock.mockReturnValueOnce(makeSpawnError(new Error('ENOENT')));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'ENOENT',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('wraps a bundler timeout in a ValidationError with the bundler prefix', () => {
    const timeoutErr = Object.assign(new Error('spawnSync node ETIMEDOUT'), {
      code: 'ETIMEDOUT',
    });
    spawnSyncMock.mockReturnValueOnce(makeSpawnError(timeoutErr));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      let caught: unknown;
      try {
        bundling.local.tryBundle(outputDir, bundling);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect(String(caught)).toMatch(/Bundler 'rolldown' timed out/);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('wraps a stderr buffer overflow in a ValidationError', () => {
    const bufferErr = Object.assign(new Error('spawnSync node ENOBUFS'), {
      code: 'ENOBUFS',
    });
    spawnSyncMock.mockReturnValueOnce(makeSpawnError(bufferErr));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      let caught: unknown;
      try {
        bundling.local.tryBundle(outputDir, bundling);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect(String(caught)).toMatch(/produced more than 16MB of output/);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('wraps a command hook timeout in a ValidationError without a stderr tail', () => {
    const timeoutErr = Object.assign(new Error('spawnSync ETIMEDOUT'), {
      code: 'ETIMEDOUT',
    });
    spawnSyncMock.mockReturnValueOnce(makeSpawnError(timeoutErr));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['echo before'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      let caught: unknown;
      try {
        bundling.local.tryBundle(outputDir, bundling);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect(String(caught)).toMatch(/Command hook 'echo before' timed out\.$/);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('runs beforeBundling hooks before the bundler', () => {
    const order: string[] = [];
    spawnSyncMock.mockImplementation((cmd) => {
      order.push(String(cmd));
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['echo before'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const hookIdx = order.indexOf('echo before');
      const nodeIdx = order.indexOf('node');
      expect(hookIdx).toBeGreaterThanOrEqual(0);
      expect(nodeIdx).toBeGreaterThan(hookIdx);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('runs afterBundling hooks after the bundler', () => {
    const order: string[] = [];
    spawnSyncMock.mockImplementation((cmd) => {
      order.push(String(cmd));
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => [],
            afterBundling: () => ['echo after'],
            beforeInstall: () => [],
          },
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const nodeIdx = order.indexOf('node');
      const afterHookIdx = order.lastIndexOf('echo after');
      expect(afterHookIdx).toBeGreaterThan(nodeIdx);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('installs nodeModules and writes package.json', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const outPkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8'),
      );
      expect(outPkg.dependencies).toHaveProperty('pino');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes packageManager field when detected from packageManager key', () => {
    fs.writeFileSync(
      pkgJsonPath,
      JSON.stringify({
        packageManager: 'pnpm@9.0.0',
        dependencies: { pino: '^9' },
      }),
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      spawnSyncMock.mockImplementation((cmd) =>
        cmd === 'corepack' ? makeErrorResult(1) : makeSuccessResult(),
      );

      const bundling = new Bundling(
        makeProps({ nodeModules: ['pino'], projectRoot: tmpDir }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const outPkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8'),
      );
      expect(outPkg.packageManager).toBe('pnpm@9.0.0');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('throws ValidationError when package manager install fails', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      spawnSyncMock
        .mockReturnValueOnce(makeSuccessResult())
        .mockReturnValueOnce(makeErrorResult(1));

      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('removes the staged lock file from the asset after install', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      bundling.local.tryBundle(outputDir, bundling);

      // The lockfile is copied in for the install but must not ship in the
      // deployed asset (bloat + dependency-graph disclosure).
      expect(fs.existsSync(path.join(outputDir, 'pnpm-lock.yaml'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('removes staged pnpm patch files from the asset after install', () => {
    fs.mkdirSync(path.join(tmpDir, 'patches'));
    fs.writeFileSync(path.join(tmpDir, 'patches/pino.patch'), 'diff');
    fs.writeFileSync(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      [
        'packages: []',
        'patchedDependencies:',
        '  "pino@9.0.0": patches/pino.patch',
      ].join('\n'),
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      bundling.local.tryBundle(outputDir, bundling);

      expect(fs.existsSync(path.join(outputDir, 'patches/pino.patch'))).toBe(
        false,
      );
      // The directory created to stage the patch must also be gone, or the
      // empty dir ships in the asset and perturbs the OUTPUT asset hash.
      expect(fs.existsSync(path.join(outputDir, 'patches'))).toBe(false);
      expect(fs.existsSync(path.join(outputDir, 'pnpm-workspace.yaml'))).toBe(
        false,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('cleans up already-staged patch files when a later patch copy throws', () => {
    fs.mkdirSync(path.join(tmpDir, 'patches'));
    fs.writeFileSync(path.join(tmpDir, 'patches/pino.patch'), 'diff');
    fs.writeFileSync(
      path.join(tmpDir, 'pnpm-workspace.yaml'),
      [
        'packages: []',
        'patchedDependencies:',
        '  "pino@9.0.0": patches/pino.patch',
        // Resolves outside the output directory, so copyPatchFile throws after
        // pino's patch has already been staged.
        '  "constructs@10.0.0": ../outside.patch',
      ].join('\n'),
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({ nodeModules: ['pino', 'constructs'] }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );

      // The first patch was staged before the throw; the finally block must
      // still remove it (and its directory) rather than leak it into the asset.
      expect(fs.existsSync(path.join(outputDir, 'patches/pino.patch'))).toBe(
        false,
      );
      expect(fs.existsSync(path.join(outputDir, 'patches'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('throws when nodeModules set but no package.json found', () => {
    fs.unlinkSync(pkgJsonPath);

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          entry: path.join(os.tmpdir(), 'nonexistent_dir', 'handler.ts'),
        }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'Cannot find a package.json',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('runs beforeInstall hook before installing nodeModules', () => {
    const order: string[] = [];
    spawnSyncMock.mockImplementation((cmd) => {
      order.push(String(cmd));
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          commandHooks: {
            beforeBundling: () => [],
            afterBundling: () => [],
            beforeInstall: () => ['echo install'],
          },
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const beforeInstallIdx = order.findIndex((s) =>
        s.includes('echo install'),
      );
      const pmIdx = order.indexOf('pnpm');
      expect(beforeInstallIdx).toBeGreaterThanOrEqual(0);
      expect(pmIdx).toBeGreaterThan(beforeInstallIdx);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('removes install-only config files (e.g. .npmrc) from the asset after install', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.npmrc'),
      '//registry.npmjs.org/:_authToken=secret',
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      bundling.local.tryBundle(outputDir, bundling);

      expect(fs.existsSync(path.join(outputDir, '.npmrc'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('removes install-only config files even when the install fails', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.npmrc'),
      '//registry.npmjs.org/:_authToken=secret',
    );
    spawnSyncMock.mockReturnValueOnce(makeSuccessResult());
    spawnSyncMock.mockReturnValueOnce(makeErrorResult(1));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
      expect(fs.existsSync(path.join(outputDir, '.npmrc'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('appends captured stderr tail to the bundler error message', () => {
    spawnSyncMock.mockReturnValueOnce(
      makeStderrResult(1, 'Build failed\n  SyntaxError: boom at line 3'),
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        /SyntaxError: boom/,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('forwards captured stderr to process.stderr on a successful bundle', () => {
    const writeSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    spawnSyncMock.mockReturnValueOnce(makeStderrResult(0, 'bundler warning'));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      bundling.local.tryBundle(outputDir, bundling);
      expect(writeSpy).toHaveBeenCalledWith('bundler warning');
    } finally {
      writeSpy.mockRestore();
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('handles a string stderr that is only whitespace (no tail appended)', () => {
    spawnSyncMock.mockReturnValueOnce(makeStderrResult(1, '   \n  '));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('handles a null stderr on the failing bundler without crashing', () => {
    spawnSyncMock.mockReturnValueOnce(makeStderrResult(1, null));

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('passes custom assetHash to Code.fromAsset', () => {
    const code = Bundling.bundle(makeProps({ assetHash: 'abc123' }));
    expect(code).toBeDefined();
  });

  // The lockfile is only present during the install; it is stripped from the
  // final asset afterwards (see "removes the staged lock file"). To verify the
  // staged content we capture it from the install spawn's cwd.
  const captureStagedLock = (outputDir: string): { value?: string } => {
    const captured: { value?: string } = {};
    spawnSyncMock.mockImplementation((_bin, _args, opts) => {
      const cwd = (opts as { cwd?: string } | undefined)?.cwd;
      const lock = cwd && path.join(cwd, 'pnpm-lock.yaml');
      if (cwd === outputDir && lock && fs.existsSync(lock)) {
        captured.value = fs.readFileSync(lock, 'utf8');
      }
      return makeSuccessResult();
    });
    return captured;
  };

  it('copies lock file from depsLockFilePath even when it is not in projectRoot', () => {
    const customLockDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'custom-lock-'),
    );
    const customLockFile = path.join(customLockDir, 'pnpm-lock.yaml');
    fs.writeFileSync(customLockFile, 'lockfileVersion: custom');

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const staged = captureStagedLock(outputDir);
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          projectRoot: tmpDir,
          depsLockFilePath: customLockFile,
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      expect(staged.value).toBe('lockfileVersion: custom');
      expect(fs.existsSync(path.join(outputDir, 'pnpm-lock.yaml'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.rmSync(customLockDir, { recursive: true, force: true });
    }
  });

  it('stages the explicit depsLockFilePath as pnpm-lock.yaml from outside projectRoot', () => {
    const otherLockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'other-lock-'));
    const otherLockFile = path.join(otherLockDir, 'pnpm-lock.yaml');
    fs.writeFileSync(otherLockFile, 'OTHER_LOCK_CONTENT');

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const staged = captureStagedLock(outputDir);
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          projectRoot: tmpDir,
          depsLockFilePath: otherLockFile,
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      expect(staged.value).toBe('OTHER_LOCK_CONTENT');
      expect(fs.existsSync(path.join(outputDir, 'pnpm-lock.yaml'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.rmSync(otherLockDir, { recursive: true, force: true });
    }
  });

  it('stages a non-standard lock file basename as pnpm-lock.yaml so pnpm reads it', () => {
    const customLockDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'renamed-lock-'),
    );
    const customLockFile = path.join(customLockDir, 'custom.lock');
    fs.writeFileSync(customLockFile, 'CUSTOM_BASENAME_CONTENT');

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const staged = captureStagedLock(outputDir);
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          projectRoot: tmpDir,
          depsLockFilePath: customLockFile,
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      expect(staged.value).toBe('CUSTOM_BASENAME_CONTENT');
      expect(fs.existsSync(path.join(outputDir, 'pnpm-lock.yaml'))).toBe(false);
      expect(fs.existsSync(path.join(outputDir, 'custom.lock'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.rmSync(customLockDir, { recursive: true, force: true });
    }
  });

  it('skips lock file copy when depsLockFilePath does not exist on disk', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          nodeModules: ['pino'],
          depsLockFilePath: path.join(tmpDir, 'nonexistent-lock.yaml'),
        }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      expect(fs.existsSync(path.join(outputDir, 'pnpm-lock.yaml'))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rethrows pm install spawn error', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      spawnSyncMock
        .mockReturnValueOnce(makeSuccessResult())
        .mockReturnValueOnce(makeSpawnError(new Error('INSTALL_ENOENT')));

      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'INSTALL_ENOENT',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rethrows shell spawn error from commandHook', () => {
    spawnSyncMock.mockImplementation((cmd) => {
      if (cmd === 'echo hook') {
        return makeSpawnError(new Error('HOOK_ENOENT'));
      }
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['echo hook'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'HOOK_ENOENT',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('throws ValidationError when command hook exits non-zero', () => {
    spawnSyncMock.mockImplementation((cmd) => {
      if (cmd === 'npm run prepare') {
        return makeErrorResult(1);
      }
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['npm run prepare'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        ValidationError,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('includes the stderr tail in the error when a command hook fails', () => {
    spawnSyncMock.mockImplementation((cmd) => {
      if (cmd === 'npm run prepare') {
        return makeStderrResult(1, 'hook boom line');
      }
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['npm run prepare'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        /hook boom line/,
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('includes signal name in error when command hook is killed by signal', () => {
    spawnSyncMock.mockImplementation((cmd) => {
      if (cmd === 'npm run prepare') {
        return {
          status: null,
          error: undefined,
          pid: 1,
          output: [],
          stdout: '',
          stderr: '',
          signal: 'SIGTERM',
        };
      }
      return makeSuccessResult();
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({
          commandHooks: {
            beforeBundling: () => ['npm run prepare'],
            afterBundling: () => [],
            beforeInstall: () => [],
          },
        }),
      );
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'SIGTERM',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('includes signal name in error when bundler is killed by signal', () => {
    spawnSyncMock.mockReturnValueOnce({
      status: null,
      error: undefined,
      pid: 1,
      output: [],
      stdout: '',
      stderr: '',
      signal: 'SIGKILL',
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'SIGKILL',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('includes signal name in error when package manager install is killed by signal', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      spawnSyncMock
        .mockReturnValueOnce(makeSuccessResult())
        .mockReturnValueOnce({
          status: null,
          error: undefined,
          pid: 1,
          output: [],
          stdout: '',
          stderr: '',
          signal: 'SIGTERM',
        });

      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      expect(() => bundling.local.tryBundle(outputDir, bundling)).toThrow(
        'SIGTERM',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes type:module and dependencies to package.json with nodeModules', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps({ nodeModules: ['pino'] }));
      bundling.local.tryBundle(outputDir, bundling);

      const outPkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8'),
      );
      expect(outPkg.type).toBe('module');
      expect(outPkg.dependencies).toHaveProperty('pino');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('writes package.json with type:module without nodeModules', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(makeProps());
      bundling.local.tryBundle(outputDir, bundling);

      const outPkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8'),
      );
      expect(outPkg).toEqual({ type: 'module' });
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('passes the absolute bundlerConfig through to the bridge verbatim', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    const absoluteConfig = path.join(tmpDir, 'build.mjs');
    try {
      const bundling = new Bundling(
        makeProps({ bundlerConfig: absoluteConfig }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const bridgeCall = spawnSyncMock.mock.calls.find((c) => c[0] === 'node');
      expect(bridgeCall).toBeDefined();

      const args = bridgeCall![1] as string[];
      expect(args[1]).toBe(absoluteConfig);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('does not invoke beforeInstall hook when nodeModules is not set', () => {
    let beforeInstallCalled = false;
    const bundling = new Bundling(
      makeProps({
        commandHooks: {
          beforeBundling: () => [],
          afterBundling: () => [],
          beforeInstall: () => {
            beforeInstallCalled = true;
            return ['echo should-not-run'];
          },
        },
      }),
    );

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      bundling.local.tryBundle(outputDir, bundling);
      expect(beforeInstallCalled).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('installs multiple nodeModules and writes all dependencies to package.json', () => {
    fs.writeFileSync(
      pkgJsonPath,
      JSON.stringify({ dependencies: { pino: '^9', zod: '4.4.3' } }),
    );
    installModule('zod', '4.4.3');

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    try {
      const bundling = new Bundling(
        makeProps({ nodeModules: ['pino', 'zod'] }),
      );
      bundling.local.tryBundle(outputDir, bundling);

      const outPkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8'),
      );
      expect(outPkg.dependencies).toHaveProperty('pino');
      expect(outPkg.dependencies).toHaveProperty('zod');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('removeEmptyParentDirs', () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rmdir-'));
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('prunes nested empty dirs up to but not including outputDir', () => {
    const nested = path.join(outputDir, 'patches', 'nested');
    fs.mkdirSync(nested, { recursive: true });

    removeEmptyParentDirs(nested, outputDir);

    expect(fs.existsSync(path.join(outputDir, 'patches'))).toBe(false);
    expect(fs.existsSync(outputDir)).toBe(true);
  });

  it('stops at the first non-empty directory', () => {
    const dir = path.join(outputDir, 'patches');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'x');

    removeEmptyParentDirs(dir, outputDir);

    expect(fs.existsSync(dir)).toBe(true);
  });

  it('does nothing when startDir is not inside outputDir', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
    try {
      removeEmptyParentDirs(outside, outputDir);
      expect(fs.existsSync(outside)).toBe(true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
