import { datadog } from 'datadog-lambda-js';
import {
  SQSRecord,
  SQSEvent,
  SQSBatchResponse,
  SQSBatchItemFailure,
} from 'aws-lambda';
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
  fn: (event: Event, ctx: LambdaContext) => Promise<Output>,
) =>
  withDatadog<Event>(async (event, ctx) => {
    try {
      const output = await fn(event, ctx);

      logger.debug({ awsRequestId: ctx.awsRequestId }, 'Function succeeded');

      return output;
    } catch (err) {
      logger.error({ awsRequestId: ctx.awsRequestId, err }, 'Function failed');

      throw new Error('Function failed');
    }
  });

export const createBatchSQSHandler =
  (
    fn: (record: SQSRecord, ctx: LambdaContext) => Promise<unknown>,
  ): Handler<SQSEvent, SQSBatchResponse> =>
  async (event, ctx) => {
    const processRecord = async (
      record: SQSRecord,
    ): Promise<SQSBatchItemFailure | undefined> =>
      loggerContext.run(
        { awsRequestId: ctx.awsRequestId, messageId: record.messageId },
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
      batchItemFailures: results.filter((item): item is SQSBatchItemFailure =>
        Boolean(item),
      ),
    };
  };
