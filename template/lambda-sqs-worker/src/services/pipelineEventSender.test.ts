import { sns } from 'src/testing/services';
import { chance } from 'src/testing/types';

import { sendPipelineEvent } from './pipelineEventSender';

describe('sendPipelineEvent', () => {
  beforeAll(sns.spy);

  afterEach(sns.clear);

  it('handles happy path', async () => {
    const messageId = chance.guid({ version: 4 });

    sns.publish.mockPromise(Promise.resolve({ MessageId: messageId }));

    await expect(sendPipelineEvent({})).resolves.toBe(messageId);

    expect(sns.publish).toHaveBeenCalledTimes(1);
  });

  it('bubbles up SNS error', () => {
    const err = Error(chance.sentence());

    sns.publish.mockPromise(Promise.reject(err));

    return expect(sendPipelineEvent({})).rejects.toThrow(err);
  });

  it('throws on missing message ID', () => {
    sns.publish.mockPromise(Promise.resolve({}));

    return expect(
      sendPipelineEvent({}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"SNS did not return a message ID"`,
    );
  });
});
