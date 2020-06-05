import { config } from 'src/config';

import { sns } from './aws';

export const sendPipelineEvent = async (event: unknown): Promise<string> => {
  const snsResponse = await sns
    .publish({
      Message: JSON.stringify(event),
      TopicArn: config.destinationSnsTopicArn,
    })
    .promise();

  if (typeof snsResponse.MessageId === 'undefined') {
    throw Error('SNS did not return a message ID');
  }

  return snsResponse.MessageId;
};
