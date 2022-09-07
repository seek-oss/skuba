import { datadog } from 'datadog-lambda-js';

import { config } from 'src/config';
import { logger, loggerContext } from 'src/framework/logging';

interface LambdaContext {
  awsRequestId: string;
}

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
  fn: (event: Event) => Promise<Output>,
) =>
  withDatadog<Event>((event, { awsRequestId }) =>
    loggerContext.run({ awsRequestId }, async () => {
      try {
        const output = await fn(event);

        logger.info('Function succeeded');

        return output;
      } catch (err) {
        logger.error({ err }, 'Function failed');

        throw new Error('Function failed');
      }
    }),
  );
