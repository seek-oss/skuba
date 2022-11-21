import 'aws-sdk-client-mock-jest';

import { PublishCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

import { chance } from 'src/testing/types';

import { sns } from './aws';
import { sendPipelineEvent } from './pipelineEventSender';

const snsMock = mockClient(sns);

describe('sendPipelineEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles happy path', async () => {
    const messageId = chance.guid({ version: 4 });

    snsMock.on(PublishCommand).resolves({ MessageId: messageId });

    await expect(sendPipelineEvent({})).resolves.toBe(messageId);

    expect(snsMock).toReceiveCommandTimes(PublishCommand, 1);
  });

  it('bubbles up SNS error', () => {
    const err = Error(chance.sentence());

    snsMock.on(PublishCommand).rejects(err);

    return expect(sendPipelineEvent({})).rejects.toThrow(err);
  });

  it('throws on missing message ID', () => {
    snsMock.on(PublishCommand).resolves({});

    return expect(
      sendPipelineEvent({}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"SNS did not return a message ID"`,
    );
  });
});
