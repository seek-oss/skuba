import 'skuba-dive/register';

import { SQSEvent } from 'aws-lambda';

import { createHandler } from 'src/framework/handler';
import { metricsClient } from 'src/framework/metrics';
import { validateJson } from 'src/framework/validation';
import { scoreJobPublishedEvent } from 'src/services/jobScorer';
import { sendPipelineEvent } from 'src/services/pipelineEventSender';
import { JobPublishedEvent } from 'src/types/pipelineEvents';

export const handler = createHandler<SQSEvent>(async (event, { logger }) => {
  const count = event.Records.length;

  if (count !== 1) {
    throw Error(`received ${count} records`);
  }

  logger.info({ count }, 'received jobs');

  metricsClient.increment('job.received', event.Records.length);

  const record = event.Records[0];

  const publishedJob = validateJson(record.body, JobPublishedEvent);

  const scoredJob = await scoreJobPublishedEvent(publishedJob);

  const snsMessageId = await sendPipelineEvent(scoredJob);

  logger.info({ snsMessageId }, 'scored job');

  metricsClient.increment('job.scored', 1);
});
