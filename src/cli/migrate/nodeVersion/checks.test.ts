import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isLikelyPackage } from './checks.js';

vi.mock('node:fs', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('node:fs/promises', () => ({
  default: memfs.fs.promises,
  ...memfs.fs.promises,
}));

beforeEach(() => {
  vol.reset();
});

describe('isLikelyPackage', () => {
  it.each`
    packageJsonFields                                                  | expected
    ${{ skuba: { type: 'package' } }}                                  | ${true}
    ${{ skuba: { type: 'application' } }}                              | ${false}
    ${{ sideEffects: true }}                                           | ${true}
    ${{ sideEffects: false }}                                          | ${true}
    ${{ types: 'index.d.ts', module: 'index.mjs', main: 'index.cjs' }} | ${true}
    ${{ exports: { '.': './index.js' } }}                              | ${true}
    ${{ types: 'index.d.ts' }}                                         | ${true}
    ${{ module: 'index.mjs' }}                                         | ${true}
    ${{ private: true }}                                               | ${false}
    ${{ publishConfig: {} }}                                           | ${true}
    ${{}}                                                              | ${false}
  `(
    'should return $expected when package.json contains $packageJsonFields',
    async ({ packageJsonFields, expected }) => {
      vol.fromJSON({
        'package.json': JSON.stringify(packageJsonFields),
      });

      await expect(isLikelyPackage('./package.json')).resolves.toBe(expected);
    },
  );

  it('should return the closest package.json', async () => {
    vol.fromJSON({
      '/project/package.json': JSON.stringify({
        skuba: { type: 'application' },
      }),
      '/project/subdir/package.json': JSON.stringify({
        skuba: { type: 'package' },
      }),
    });

    await expect(isLikelyPackage('/project/subdir/someFile.ts')).resolves.toBe(
      true,
    );
  });
});
