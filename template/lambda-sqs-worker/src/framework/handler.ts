import { Context } from 'aws-lambda';

import { logger, loggerContext } from 'src/framework/logging';

export const createHandler =
  <Event, Output = unknown>(fn: (event: Event) => Promise<Output>) =>
  (event: Event, { awsRequestId }: Context) =>
    loggerContext.run({ awsRequestId }, async () => {
      try {
        const output = await fn(event);

        logger.info('request');

        return output;
      } catch (err) {
        logger.error({ err }, 'request');

        throw new Error('invoke error');
      }
    });
