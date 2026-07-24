import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors.js';

describe('ValidationError', () => {
  it('has name ValidationError', () => {
    const err = new ValidationError('boom');
    expect(err.name).toBe('ValidationError');
  });

  it('preserves message', () => {
    const err = new ValidationError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });

  it('is an instance of Error', () => {
    expect(new ValidationError('x')).toBeInstanceOf(Error);
  });
});
