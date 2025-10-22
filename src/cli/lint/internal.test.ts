import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { internalLint } from './internal.js';

describe('internalLint', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {
      /* no-op */
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes on skuba itself', () =>
    expect(internalLint('lint')).resolves.toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    }));
});
