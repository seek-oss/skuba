import { SNS } from 'aws-sdk';

export const sns = new SNS({
  apiVersion: '2010-03-31',
});
