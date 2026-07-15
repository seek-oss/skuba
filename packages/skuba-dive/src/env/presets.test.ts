import { afterEach, describe, expect, test, vi } from 'vitest';

import * as presets from './presets.js';

describe('presets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('nonNegativeInteger', () => {
    vi.stubEnv('SKUBA_DIVE', '123');

    expect(presets.nonNegativeInteger('SKUBA_DIVE')).toBe(123);
  });

  test('oneOf', () => {
    vi.stubEnv('SKUBA_DIVE', '123');

    expect(presets.oneOf(['123', '456'])('SKUBA_DIVE')).toBe('123');
  });

  test('string', () => {
    vi.stubEnv('SKUBA_DIVE', '123');

    expect(presets.string('SKUBA_DIVE')).toBe('123');
  });

  test('boolean', () => {
    vi.stubEnv('IS_A', 'false');
    expect(presets.boolean('IS_A')).toBe(false);
    vi.stubEnv('IS_B', 'true');
    expect(presets.boolean('IS_B')).toBe(true);
  });
});
