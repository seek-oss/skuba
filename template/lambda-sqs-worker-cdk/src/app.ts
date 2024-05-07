import createLogger from '@seek/logger';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { config } from './config';

const logger = createLogger({
  name: '<%- serviceName %>',
  version: config.version,
});

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
const smokeTest = async () => Promise.resolve();

export const handler: SQSHandler = (event: SQSEvent) => {
  // Treat an empty object as our smoke test event.
  if (!Object.keys(event).length) {
    logger.debug('Received smoke test request');
    return smokeTest();
  }

  logger.info('Hello World!');

  return;
};
