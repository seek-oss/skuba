import type { SQSEvent } from 'aws-lambda';

import { createCtx } from 'src/testing/handler';
import { chance } from 'src/testing/types';

import { createHandler } from './handler';
import { logger, stdoutMock } from './logging';

describe('createHandler', () => {
  const ctx = createCtx();
  const input: SQSEvent = {
    Records: [],
  };

  afterEach(stdoutMock.clear);

  it('handles happy path', async () => {
    const output = chance.paragraph();

    const handler = createHandler((event) => {
      expect(event).toBe(input);

      logger.debug('Handler invoked');

      return Promise.resolve(output);
    });

    await expect(handler(input, ctx)).resolves.toBe(output);

    expect(stdoutMock.calls).toEqual([
      {
        awsRequestId: '-',
        level: 20,
        msg: 'Handler invoked',
      },
      {
        awsRequestId: '-',
        level: 20,
        msg: 'Function completed',
      },
    ]);
  });

  it('handles async error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => Promise.reject(err));

    await expect(handler(input, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toEqual([
      {
        awsRequestId: '-',
        err: expect.objectContaining({
          message: err.message,
          type: 'Error',
        }),
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });

  it('handles sync error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => {
      throw err;
    });

    await expect(handler(input, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toEqual([
      {
        awsRequestId: '-',
        err: expect.objectContaining({
          message: err.message,
          type: 'Error',
        }),
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });
});
