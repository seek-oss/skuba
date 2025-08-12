import type {
  Context as LambdaContext,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';

import { lambdaContext, logger, recordContext } from 'src/framework/logging.js';

type Handler<Event, Output> = (
  event: Event,
  ctx: LambdaContext,
) => Promise<Output>;

export const createHandler =
  <Event extends SQSEvent, Output = unknown>(
    fn: (event: Event, ctx: LambdaContext) => Promise<Output>,
  ): Handler<Event, Output> =>
  async (event, ctx) =>
    lambdaContext.run({ awsRequestId: ctx.awsRequestId }, async () => {
      try {
        const output = await fn(event, ctx);

        logger.debug({ output }, 'Function completed');

        return output;
      } catch (err) {
        logger.error(err, 'Function failed');

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
      recordContext.run({ sqsMessageId: record.messageId }, async () => {
        try {
          await fn(record, ctx);
          return;
        } catch (err) {
          logger.error(err, 'Processing record failed');
          return {
            itemIdentifier: record.messageId,
          };
        }
      });

    const results = await Promise.all(event.Records.map(processRecord));

    return {
      batchItemFailures: results.filter((item) => item !== undefined),
    };
  };
