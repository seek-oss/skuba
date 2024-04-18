import { SNSClient } from '@aws-sdk/client-sns';

export const sns = new SNSClient({
  apiVersion: '2010-03-31',
});
