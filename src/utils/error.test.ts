import { inspect } from 'util';

import { createTerseError } from './error';

describe('createTerseError', () => {
  it('creates a terse error for `util.inspect`', () => {
    const message = 'Badness!';

    const err = createTerseError(message);

    // Retains standard message and stack behaviour
    expect(err.message).toBe(message);
    expect(err.stack).not.toBe(message);
    expect(err.stack).toContain(message);

    // Declares custom inspect function
    expect(inspect(err)).toBe(message);
  });
});
