import { beforeEach, expect, it, vi } from 'vitest';
import memfs, { vol } from 'memfs';

import { findRoot } from './findRoot.js';

vi.mock('fs', () => memfs);

beforeEach(() => vol.reset());

it('finds the current root', async () => {
  vol.fromJSON({
    'a/b/.git': null,
  });

  await expect(findRoot({ dir: 'a/b' })).resolves.toBe('a/b');
});

it('finds the root root', async () => {
  vol.fromJSON({
    '.git': null,
  });

  await expect(findRoot({ dir: 'c/d' })).resolves.toBe('.');
});

it('finds the closest root', async () => {
  vol.fromJSON({
    '.git': null,
    'a/.git': null,
  });

  await expect(findRoot({ dir: 'a/b/c' })).resolves.toBe('a');
});

it('returns null if no root is found', async () => {
  vol.fromJSON({});

  await expect(findRoot({ dir: 'skuba' })).resolves.toBeNull();
});
