import createLogger from '@seek/logger';
import type { SQSEvent, SQSHandler } from 'aws-lambda';

const logger = createLogger({
  name: '<%- serviceName %>',
});

export const handler: SQSHandler = (_: SQSEvent) => {
  logger.info('Hello World!');
};
