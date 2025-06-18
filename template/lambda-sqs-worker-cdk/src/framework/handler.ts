import type { Context as LambdaContext } from 'aws-lambda';
import { datadog } from 'datadog-lambda-js';

import { config } from 'src/config.js';
import { logger, loggerContext } from 'src/framework/logging.js';

type Handler<Event, Output> = (
  event: Event,
  ctx: LambdaContext,
) => Promise<Output>;

/**
 * Conditionally applies the Datadog wrapper to a Lambda handler.
 *
 * This also "fixes" its broken type definitions.
 */
const withDatadog = <Event, Output = unknown>(
  fn: Handler<Event, Output>,
): Handler<Event, Output> =>
  // istanbul ignore next
  config.metrics ? (datadog(fn) as Handler<Event, Output>) : fn;

export const createHandler = <Event, Output = unknown>(
  fn: (event: Event, ctx: LambdaContext) => Promise<Output>,
) =>
  withDatadog<Event>((event, ctx) =>
    loggerContext.run({ awsRequestId: ctx.awsRequestId }, async () => {
      try {
        const output = await fn(event, ctx);

        logger.debug('Function succeeded');

        return output;
      } catch (err) {
        logger.error({ err }, 'Function failed');

        throw new Error('Function failed');
      }
    }),
  );
