import { describe, expect, it } from 'vitest';

import * as skubaDive from './index.js';

describe('skuba-dive', () => {
  it('exports namespaces', () => expect(skubaDive).toHaveProperty('Env'));
});
