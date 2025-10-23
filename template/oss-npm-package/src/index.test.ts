import { describe, expect, it } from 'vitest';
import { log } from './index.js';

describe('app', () => {
  it('defines a log function', () => expect(log).toBeDefined());
});
