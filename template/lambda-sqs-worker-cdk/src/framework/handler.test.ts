import { createCtx } from 'src/testing/handler.js';
import { logger } from 'src/testing/logging.js';
import { chance } from 'src/testing/types.js';

import { createHandler } from './handler.js';

describe('createHandler', () => {
  const ctx = createCtx();
  const input = chance.paragraph();

  beforeAll(logger.spy);

  afterEach(logger.clear);

  it('handles happy path', async () => {
    const output = chance.paragraph();

    const handler = createHandler((event) => {
      expect(event).toBe(input);

      logger.debug('Handler invoked');

      return Promise.resolve(output);
    });

    await expect(handler(input, ctx)).resolves.toBe(output);

    expect(logger.error).not.toHaveBeenCalled();

    expect(logger.debug.mock.calls).toEqual([
      ['Handler invoked'],
      ['Function succeeded'],
    ]);
  });

  it('handles async error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => Promise.reject(err));

    await expect(handler(input, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');

    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('handles sync error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => {
      throw err;
    });

    await expect(handler(input, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');

    expect(logger.debug).not.toHaveBeenCalled();
  });
});
