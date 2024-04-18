import { PublishCommand } from '@aws-sdk/client-sns';

import { sns } from 'src/testing/services';
import { chance } from 'src/testing/types';

import { sendPipelineEvent } from './pipelineEventSender';

describe('sendPipelineEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles happy path', async () => {
    const messageId = chance.guid({ version: 4 });

    sns.publish.resolves({ MessageId: messageId });

    await expect(sendPipelineEvent({})).resolves.toBe(messageId);

    expect(sns.client).toReceiveCommandTimes(PublishCommand, 1);
  });

  it('bubbles up SNS error', () => {
    const err = Error(chance.sentence());

    sns.publish.rejects(err);

    return expect(sendPipelineEvent({})).rejects.toThrow(err);
  });

  it('throws on missing message ID', () => {
    sns.publish.resolves({});

    return expect(
      sendPipelineEvent({}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"SNS did not return a message ID"`,
    );
  });
});
