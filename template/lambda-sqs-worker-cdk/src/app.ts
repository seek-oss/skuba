/* eslint-disable no-console */
import { SQSEvent, SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = (event: SQSEvent) => {
  console.log(event);
};
