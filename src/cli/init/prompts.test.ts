import { describe, expect, it } from 'vitest';

import { BASE_PROMPT_DEFAULTS } from './prompts.js';
import { DEFAULT_RENOVATE_PRESET } from './types.js';

describe('BASE_PROMPT_DEFAULTS', () => {
  it('defaults the Renovate preset to Rynovate', () => {
    expect(BASE_PROMPT_DEFAULTS).toMatchObject({
      platformName: 'arm64',
      defaultBranch: 'main',
      renovatePreset: DEFAULT_RENOVATE_PRESET,
    });
  });
});
