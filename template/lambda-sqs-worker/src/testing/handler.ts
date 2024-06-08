import type { Context, SQSEvent } from 'aws-lambda';

import { chance } from './types';

export const createCtx = () =>
  ({
    awsRequestId: chance.guid({ version: 4 }),
  }) as Context;

export const createSqsEvent = (bodies: string[]) =>
  ({
    Records: bodies.map((body, id) => ({ body, messageId: id.toString() })),
  }) as SQSEvent;
