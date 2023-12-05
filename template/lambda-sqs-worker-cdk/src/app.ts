import 'skuba-dive/register';

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
  return true;
};

export const handler = createHandler<SQSEvent>(async (event) => {
  // Treat an empty object as our smoke test event.
  if (!Object.keys(event).length) {
    logger.debug('Received smoke test request');
    return smokeTest();
  }

  logger.info('Hello World!');
});
