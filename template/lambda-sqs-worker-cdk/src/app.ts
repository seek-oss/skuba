import 'skuba-dive/register';

import type { SQSEvent, SQSHandler } from 'aws-lambda';

import { logger } from 'src/framework/logging';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
const smokeTest = async () => {
  return true;
};

export const handler: SQSHandler = (event: SQSEvent) => {
  // Treat an empty object as our smoke test event.
  if (!Object.keys(event).length) {
    logger.debug('Received smoke test request');
    return smokeTest();
  }

  logger.info('Hello World!');
};
