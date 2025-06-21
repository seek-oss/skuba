import type {
  Context as LambdaContext,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { datadog } from 'datadog-lambda-js';

import { config } from 'src/config';
import { logger, loggerContext, withRequest } from 'src/framework/logging';

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

export const createHandler = <Event extends SQSEvent, Output = unknown>(
  fn: (event: Event, ctx: LambdaContext) => Promise<Output>,
) =>
  withDatadog<Event>(async (event, ctx) => {
    try {
      withRequest(event, ctx);
      const output = await fn(event, ctx);

      logger.debug('Function completed');

      return output;
    } catch (err) {
      logger.error({ err }, 'Function failed');

      throw new Error('Function failed');
    }
  });

export const createBatchSQSHandler =
  (
    fn: (record: SQSRecord, ctx: LambdaContext) => Promise<unknown>,
  ): Handler<SQSEvent, SQSBatchResponse> =>
  async (event, ctx) => {
    const processRecord = (
      record: SQSRecord,
    ): Promise<SQSBatchItemFailure | undefined> =>
      loggerContext.run(
        { awsRequestId: ctx.awsRequestId, sqsMessageId: record.messageId },
        async () => {
          try {
            await fn(record, ctx);
            return;
          } catch (err) {
            logger.error({ err }, 'Processing record failed');
            return {
              itemIdentifier: record.messageId,
            };
          }
        },
      );

    const results = await Promise.all(event.Records.map(processRecord));

    return {
      batchItemFailures: results.filter((item) => item !== undefined),
    };
  };
