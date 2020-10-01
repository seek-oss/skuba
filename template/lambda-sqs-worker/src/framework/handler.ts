import { pino } from '@seek/logger-js';
import { Context } from 'aws-lambda';

import { contextLogger } from 'src/framework/logging';

export const createHandler = <Event, Output = unknown>(
  fn: (event: Event, ctx: { logger: pino.Logger }) => Promise<Output>,
) =>
  async function lambdaHandler(event: Event, ctx: Context) {
    const logger = contextLogger(ctx);

    try {
      const output = await fn(event, { logger });

      logger.info('request');

      return output;
    } catch (err: unknown) {
      logger.error({ err }, 'request');

      throw new Error('invoke error');
    }
  };
