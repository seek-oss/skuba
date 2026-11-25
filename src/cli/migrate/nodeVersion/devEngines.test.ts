import { describe, expect, it } from 'vitest';

import {
  patchBuildkiteDevEngines,
  patchPackageJsonDevEngines,
} from './devEngines.js';

const stringify = (packageJson: Record<string, unknown>) =>
  `${JSON.stringify(packageJson, null, 2)}\n`;

describe('patchPackageJsonDevEngines', () => {
  it.each([
    [
      'a pinned version',
      { name: 'my-app', packageManager: 'pnpm@12.20.0' },
      {
        name: 'my-app',
        devEngines: {
          packageManager: { name: 'pnpm', version: '12.20.0', onFail: 'error' },
        },
      },
    ],
    [
      'a version with an integrity hash',
      { name: 'my-app', packageManager: 'pnpm@10.34.5+sha512-abc123' },
      {
        name: 'my-app',
        devEngines: {
          packageManager: {
            name: 'pnpm',
            version: '10.34.5+sha512-abc123',
            onFail: 'error',
          },
        },
      },
    ],
    [
      'existing devEngines',
      {
        name: 'my-app',
        devEngines: { runtime: { name: 'node', version: '>=26' } },
        packageManager: 'pnpm@12.20.0',
      },
      {
        name: 'my-app',
        devEngines: {
          runtime: { name: 'node', version: '>=26' },
          packageManager: { name: 'pnpm', version: '12.20.0', onFail: 'error' },
        },
      },
    ],
  ])('migrates %s', async (_, before, after) => {
    const result = await patchPackageJsonDevEngines(stringify(before));

    expect(JSON.parse(result)).toEqual(after);
  });

  it.each([
    ['no packageManager field', { name: 'my-app' }],
    [
      'an existing devEngines.packageManager',
      {
        name: 'my-app',
        devEngines: { packageManager: { name: 'pnpm', version: '^12.0.0' } },
        packageManager: 'pnpm@12.20.0',
      },
    ],
    [
      'an unparseable packageManager',
      { name: 'my-app', packageManager: 'pnpm' },
    ],
  ])('leaves %s alone', async (_, packageJson) => {
    const contents = stringify(packageJson);

    await expect(patchPackageJsonDevEngines(contents)).resolves.toBe(contents);
  });

  it('leaves invalid JSON alone', async () => {
    await expect(patchPackageJsonDevEngines('{')).resolves.toBe('{');
  });
});

describe('patchBuildkiteDevEngines', () => {
  it('migrates cache-on references', () => {
    expect(
      patchBuildkiteDevEngines(
        'cache-on:\n  - package.json#.packageManager\n  - packages/api/package.json#.packageManager\n  - pnpm-lock.yaml\n',
      ),
    ).toBe(
      'cache-on:\n  - package.json#.devEngines.packageManager\n  - packages/api/package.json#.devEngines.packageManager\n  - pnpm-lock.yaml\n',
    );
  });

  it.each([
    ['migrated references', '- package.json#.devEngines.packageManager\n'],
    ['other fields', '- package.json#.packageManagerVersion\n'],
  ])('leaves %s alone', (_, contents) => {
    expect(patchBuildkiteDevEngines(contents)).toBe(contents);
  });
});
