import { createCtx } from 'src/testing/handler';
import { logger } from 'src/testing/logging';
import { chance } from 'src/testing/types';

import { createHandler } from './handler';

describe('createHandler', () => {
  const ctx = createCtx();
  const input = chance.paragraph();

  beforeAll(logger.spy);

  afterEach(logger.clear);

  it('handles happy path', async () => {
    const output = chance.paragraph();

    const handler = createHandler((event) => {
      expect(event).toBe(input);

      logger.info('hello from handler');

      return Promise.resolve(output);
    });

    await expect(handler(input, ctx)).resolves.toBe(output);

    expect(logger.error).not.toHaveBeenCalled();

    expect(logger.info.mock.calls).toEqual([
      ['hello from handler'],
      ['request'],
    ]);
  });

  it('handles async error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => Promise.reject(err));

    await expect(handler(input, ctx)).rejects.toThrow('invoke error');

    expect(logger.error.mock.calls).toEqual([[{ err }, 'request']]);

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('handles sync error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => {
      throw err;
    });

    await expect(handler(input, ctx)).rejects.toThrow('invoke error');

    expect(logger.error.mock.calls).toEqual([[{ err }, 'request']]);

    expect(logger.info).not.toHaveBeenCalled();
  });
});
