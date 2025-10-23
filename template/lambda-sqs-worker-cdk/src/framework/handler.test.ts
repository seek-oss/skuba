import { afterEach, describe, expect, it } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

import { createHandler } from './handler.js';
import { logger, stdoutMock } from './logging.js';

import { createCtx } from '#src/testing/handler.js';
import { chance } from '#src/testing/types.js';

describe('createHandler', () => {
  const ctx = createCtx();
  const input: SQSEvent = {
    Records: [],
  };

  afterEach(stdoutMock.clear);

  it('handles happy path', async () => {
    const output = chance.sentence();

    const handler = createHandler((event) => {
      expect(event).toBe(input);

      logger.debug('Handler invoked');

      return Promise.resolve(output);
    });

    await expect(handler(input, ctx)).resolves.toBe(output);

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        level: 20,
        msg: 'Handler invoked',
      },
      {
        awsRequestId: '-',
        level: 20,
        output,
        msg: 'Function completed',
      },
    ]);
  });

  it('handles async error', async () => {
    const err = Error(chance.sentence());

    const handler = createHandler(() => Promise.reject(err));

    await expect(handler(input, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        error: {
          message: err.message,
          type: 'Error',
        },
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

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        error: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });
});
