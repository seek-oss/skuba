import { describe, expect, it } from 'vitest';

import { BASE_PROMPT_PROPS } from './prompts.js';
import { DEFAULT_RENOVATE_PRESET } from './types.js';

describe('BASE_PROMPT_PROPS', () => {
  it('defaults the Renovate preset to Rynovate', () => {
    expect(
      BASE_PROMPT_PROPS.choices.find(({ name }) => name === 'renovatePreset'),
    ).toMatchObject({
      message: 'Renovate preset',
      initial: DEFAULT_RENOVATE_PRESET,
      allowInitial: true,
    });
  });
});
