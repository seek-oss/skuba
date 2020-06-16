import { createCtx } from 'src/testing/handler';
import { contextLogger } from 'src/testing/logging';
import { chance } from 'src/testing/types';

import { createHandler } from './handler';

describe('createHandler', () => {
  const ctx = createCtx();
  const input = chance.paragraph();

  beforeAll(contextLogger.spy);

  afterEach(contextLogger.clear);

  it('handles happy path', async () => {
    const output = chance.paragraph();

    const handler = createHandler((event, { logger }) => {
      expect(event).toBe(input);

      logger.info('hello from handler');

      return Promise.resolve(output);
    });

    await expect(handler(input, ctx)).resolves.toBe(output);

    expect(contextLogger.error).not.toBeCalled();

    expect(contextLogger.info.mock.calls).toEqual([
      ['hello from handler'],
      ['request'],
    ]);
  });

  it('handles async error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => Promise.reject(err));

    await expect(handler(input, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error.mock.calls).toEqual([[{ err }, 'request']]);

    expect(contextLogger.info).not.toBeCalled();
  });

  it('handles sync error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => {
      throw err;
    });

    await expect(handler(input, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error.mock.calls).toEqual([[{ err }, 'request']]);

    expect(contextLogger.info).not.toBeCalled();
  });
});
