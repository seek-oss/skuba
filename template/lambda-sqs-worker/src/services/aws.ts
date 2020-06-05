import { Agent } from 'https';

import { SNS } from 'aws-sdk';

const agent = new Agent({
  keepAlive: true,
  rejectUnauthorized: true,
});

export const sns = new SNS({
  apiVersion: '2010-03-31',
  httpOptions: { agent },
});
