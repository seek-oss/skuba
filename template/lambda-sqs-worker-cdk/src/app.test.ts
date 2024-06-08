import { PublishCommand } from '@aws-sdk/client-sns';
import type { SQSBatchResponse } from 'aws-lambda';

import { metricsClient } from 'src/framework/metrics';
import { createCtx, createSqsEvent } from 'src/testing/handler';
import { logger } from 'src/testing/logging';
import { scoringService, sns } from 'src/testing/services';
import { chance, mockJobPublishedEvent } from 'src/testing/types';

import * as app from './app';

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

  beforeAll(logger.spy);
  beforeAll(scoringService.spy);

  beforeEach(() => {
    scoringService.request.mockResolvedValue(score);
    sns.publish.resolves({ MessageId: chance.guid({ version: 4 }) });
  });

  afterEach(() => {
    logger.clear();
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

    expect(logger.error).not.toHaveBeenCalled();

    expect(logger.debug.mock.calls).toEqual([
      [{ count: 1 }, 'Received jobs'],
      [{ snsMessageId: expect.any(String) }, 'Scored job'],
      [{ awsRequestId: ctx.awsRequestId }, 'Function succeeded'],
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
  });

  it('throws on invalid input', () => {
    const event = createSqsEvent(['}']);

    return expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: '0' }],
    });
  });

  it('bubbles up scoring service error', async () => {
    const err = Error(chance.sentence());

    scoringService.request.mockRejectedValue(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: '0' }],
    });

    expect(logger.error).toHaveBeenCalledWith(
      { err },
      'Processing record failed',
    );
  });

  it('bubbles up SNS error', async () => {
    const err = Error(chance.sentence());

    sns.publish.rejects(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: '0' }],
    });

    expect(logger.error).toHaveBeenCalledWith(
      { err },
      'Processing record failed',
    );
  });

  it('handles partial failure', async () => {
    const event = createSqsEvent([
      JSON.stringify(jobPublished),
      '}',
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).resolves.toEqual<SQSBatchResponse>({
      batchItemFailures: [{ itemIdentifier: '1' }],
    });
  });

  it('throws on zero records', async () => {
    const err = new Error('Malformed SQS event with no records');

    const event = createSqsEvent([]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith(
      { awsRequestId: ctx.awsRequestId, err },
      'Function failed',
    );
  });
});
