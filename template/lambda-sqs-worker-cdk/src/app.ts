import 'skuba-dive/register';

import { isLambdaHook } from '@seek/aws-codedeploy-hooks';
import type { SQSEvent } from 'aws-lambda';

import { createHandler } from 'src/framework/handler';
import { logger } from 'src/framework/logging';
import { metricsClient } from 'src/framework/metrics';
import { validateJson } from 'src/framework/validation';
import { scoreJobPublishedEvent, scoringService } from 'src/services/jobScorer';
import { sendPipelineEvent } from 'src/services/pipelineEventSender';
import { JobPublishedEventSchema } from 'src/types/pipelineEvents';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
const smokeTest = async () => {
  await Promise.all([scoringService.smokeTest(), sendPipelineEvent({}, true)]);
};

export const handler = createHandler<SQSEvent>(async (event, ctx) => {
  // Treat an empty object as our smoke test event.
  if (!Object.entries(event).length) {
    if (process.env.SKIP_SMOKE && isLambdaHook(event, ctx)) {
      // Expedite deployment even if dependencies are unhealthy.
      return;
    }

    // Run dependency checks otherwise.
    logger.debug('Smoke test event received');
    return smokeTest();
  }

  const count = event.Records.length;

  if (count !== 1) {
    throw Error(`Received ${count} records`);
  }

  logger.debug({ count }, 'Received jobs');

  metricsClient.distribution('job.received', event.Records.length);

  const record = event.Records[0];
  if (!record) {
    throw new Error('Malformed SQS event with no records');
  }

  const { body } = record;

  // TODO: this throws an error, which will cause the Lambda function to retry
  // the event and eventually send it to your dead-letter queue. If you don't
  // trust your source to provide consistently well-formed input, consider
  // catching and handling this error in code.
  const publishedJob = validateJson(body, JobPublishedEventSchema);

  const scoredJob = await scoreJobPublishedEvent(publishedJob);

  const snsMessageId = await sendPipelineEvent(scoredJob);

  logger.debug({ snsMessageId }, 'Scored job');

  metricsClient.distribution('job.scored', 1);
});
