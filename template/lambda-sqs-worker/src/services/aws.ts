import { Agent } from 'https';

import { SNS } from 'aws-sdk';

const agent = new Agent({
  rejectUnauthorized: true,
});

export const sns = new SNS({
  apiVersion: '2010-03-31',
  httpOptions: { agent },
});
