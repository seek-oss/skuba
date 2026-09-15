import { describe, expect, it } from 'vitest';

describe('arithmetic', () => {
  it('fails an assertion', () => {
    expect(1).toBe(2);
  });

  it('passes', () => {
    expect(1).toBe(1);
  });
});
