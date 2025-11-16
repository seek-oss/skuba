import { describe, expect, it } from 'vitest';

import * as skuba from './index.js';

describe('skuba', () => {
  it('exports', () => {
    expect(skuba).toHaveProperty('Net');
  });
});
