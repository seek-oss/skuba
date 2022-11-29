import { PublishCommand } from '@aws-sdk/client-sns';

import { config } from 'src/config';

import { sns } from './aws';

export const sendPipelineEvent = async (
  event: unknown,
  smokeTest: boolean = false,
): Promise<string> => {
  const snsResponse = await sns.send(
    new PublishCommand({
      Message: JSON.stringify(event),
      ...(smokeTest && {
        MessageAttributes: {
          // Used for connectivity tests.
          // Subscribers should filter out messages containing this attribute.
          SmokeTest: {
            DataType: 'String',
            StringValue: 'true',
          },
        },
      }),
      TopicArn: config.destinationSnsTopicArn,
    }),
  );

  if (snsResponse.MessageId === undefined) {
    throw Error('SNS did not return a message ID');
  }

  return snsResponse.MessageId;
};
