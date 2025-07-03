import { PublishCommand } from '@aws-sdk/client-sns';

import { metricsClient } from 'src/framework/metrics';
import { createCtx, createSqsEvent } from 'src/testing/handler';
import { scoringService, sns } from 'src/testing/services';
import { chance, mockJobPublishedEvent } from 'src/testing/types';

import * as app from './app';
import { stdoutMock } from './framework/logging';

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

    await expect(app.handler(event, ctx)).resolves.toBeUndefined();

    expect(scoringService.request).toHaveBeenCalledTimes(1);

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        count: 1,
        level: 20,
        msg: 'Received jobs',
      },
      {
        awsRequestId: '-',
        level: 20,
        msg: 'Scored job',
        snsMessageId: expect.any(String),
      },
      {
        awsRequestId: '-',
        level: 20,
        msg: 'Function succeeded',
      },
    ]);

    expect(distribution.mock.calls).toEqual([
      ['job.received', 1],
      ['job.scored', 1],
    ]);

    expect(sns.client).toReceiveCommandTimes(PublishCommand, 1);
  });

  it('throws on invalid input', () => {
    const event = createSqsEvent(['}']);

    return expect(app.handler(event, ctx)).rejects.toThrow('Function failed');
  });

  it('bubbles up scoring service error', async () => {
    const err = Error(chance.sentence());

    scoringService.request.mockRejectedValue(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        count: 1,
        level: 20,
        msg: 'Received jobs',
      },
      {
        awsRequestId: '-',
        err: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });

  it('bubbles up SNS error', async () => {
    const err = Error(chance.sentence());

    sns.publish.rejects(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        count: 1,
        level: 20,
        msg: 'Received jobs',
      },
      {
        awsRequestId: '-',
        err: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });

  it('throws on zero records', async () => {
    const event = createSqsEvent([]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        err: {
          message: 'Received 0 records',
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });

  it('throws on multiple records', async () => {
    const event = createSqsEvent([
      JSON.stringify(jobPublished),
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(stdoutMock.calls).toMatchObject([
      {
        awsRequestId: '-',
        err: {
          message: 'Received 2 records',
          type: 'Error',
        },
        level: 50,
        msg: 'Function failed',
      },
    ]);
  });
});
