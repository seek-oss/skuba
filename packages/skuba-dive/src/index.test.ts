import { describe, expect, it } from 'vitest';
import * as skubaDive from './index.js';

describe('skuba-dive', () => {
  it('exports a top-level register hook', () =>
    expect(import('../register.js')).resolves.toBeDefined());

  it('exports namespaces', () => expect(skubaDive).toHaveProperty('Env'));
});
