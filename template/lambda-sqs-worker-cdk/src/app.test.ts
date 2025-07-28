import { PublishCommand } from '@aws-sdk/client-sns';
import type { SQSBatchResponse } from 'aws-lambda';

import { metricsClient } from 'src/framework/metrics.js';
import { createCtx, createSqsEvent } from 'src/testing/handler.js';
import { scoringService, sns } from 'src/testing/services.js';
import { chance, mockJobPublishedEvent } from 'src/testing/types.js';

import * as app from './app.js';
import { stdoutMock } from './framework/logging.js';

describe('app', () => {
  it('exports a handler', () => expect(app).toHaveProperty('handler'));
});

describe('handler', () => {
  const ctx = createCtx();

  const jobPublished = mockJobPublishedEvent({ entityId: chance.name() });

  const score = chance.floating({ max: 1, min: 0 });

  const distribution = jest
    .spyOn(metricsClient, 'distribution')
    .mockReturnValue();

  beforeAll(scoringService.spy);

  beforeEach(() => {
    scoringService.request.mockResolvedValue(score);
    sns.publish.resolves({ MessageId: chance.guid({ version: 4 }) });
  });

  afterEach(() => {
    stdoutMock.clear();
    distribution.mockClear();
    scoringService.clear();
    sns.clear();
  });

  it('handles one record', async () => {
    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [],
    });

    expect(scoringService.request).toHaveBeenCalledTimes(1);

    expect(stdoutMock.calls).toMatchObject([
      { count: 1, level: 20, msg: 'Received jobs' },
      {
        level: 20,
        msg: 'Scored job',
        snsMessageId: expect.any(String),
        sqsMessageId: event.Records[0]!.messageId,
      },
      { level: 20, msg: 'Function completed' },
    ]);

    expect(distribution.mock.calls).toEqual([
      ['job.received', 1],
      ['job.scored', 1],
    ]);

    expect(sns.client).toReceiveCommandTimes(PublishCommand, 1);
  });

  it('handles multiple records', async () => {
    const event = createSqsEvent([
      JSON.stringify(jobPublished),
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [],
    });

    expect(stdoutMock.calls).toMatchObject([
      { count: 2, level: 20, msg: 'Received jobs' },
      {
        level: 20,
        msg: 'Scored job',
        snsMessageId: expect.any(String),
        sqsMessageId: event.Records[0]!.messageId,
      },
      {
        level: 20,
        msg: 'Scored job',
        snsMessageId: expect.any(String),
        sqsMessageId: event.Records[1]!.messageId,
      },
      { level: 20, msg: 'Function completed' },
    ]);
  });

  it('handles partial batch failure', async () => {
    const event = createSqsEvent([
      JSON.stringify('}'),
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: event.Records[0]!.messageId }],
    });

    expect(stdoutMock.calls).toMatchObject([
      { count: 2, level: 20, msg: 'Received jobs' },
      {
        err: {
          name: 'ZodError',
          type: 'ZodError',
        },
        level: 50,
        msg: 'Processing record failed',
        sqsMessageId: event.Records[0]!.messageId,
      },
      {
        level: 20,
        msg: 'Scored job',
        snsMessageId: expect.any(String),
        sqsMessageId: event.Records[1]!.messageId,
      },
      { level: 20, msg: 'Function completed' },
    ]);
  });

  it('returns a batchItemFailure on invalid input', () => {
    const event = createSqsEvent(['}']);

    return expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [
        {
          itemIdentifier: event.Records[0]!.messageId,
        },
      ],
    });
  });

  it('bubbles up scoring service error', async () => {
    const err = Error(chance.sentence());

    scoringService.request.mockRejectedValue(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: event.Records[0]!.messageId }],
    });

    expect(stdoutMock.calls).toMatchObject([
      { count: 1, level: 20, msg: 'Received jobs' },
      {
        err: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        msg: 'Processing record failed',
        sqsMessageId: event.Records[0]!.messageId,
      },
      { level: 20, msg: 'Function completed' },
    ]);
  });

  it('bubbles up SNS error', async () => {
    const err = Error(chance.sentence());

    sns.publish.rejects(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: event.Records[0]!.messageId }],
    });

    expect(stdoutMock.calls).toMatchObject([
      {
        count: 1,
        level: 20,
        msg: 'Received jobs',
      },
      {
        err: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        msg: 'Processing record failed',
        sqsMessageId: event.Records[0]!.messageId,
      },
      {
        level: 20,
        msg: 'Function completed',
      },
    ]);
  });

  it('throws on zero records', async () => {
    const event = createSqsEvent([]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        err: {
          message: 'Received 0 records',
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });
});
