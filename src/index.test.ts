import { describe, expect, it } from 'vitest';

import * as skuba from './index.ts';

describe('skuba', () => {
  it('exports', () => {
    expect(skuba).toHaveProperty('Net');
  });
});
