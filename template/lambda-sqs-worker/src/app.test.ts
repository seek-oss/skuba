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
  beforeAll(sns.spy);

  beforeEach(() => {
    scoringService.request.mockResolvedValue(score);
    sns.publish.mockPromise(
      Promise.resolve({ MessageId: chance.guid({ version: 4 }) }),
    );
  });

  afterEach(() => {
    logger.clear();
    distribution.mockClear();
    scoringService.clear();
    sns.clear();
  });

  it('handles one record', async () => {
    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toBeUndefined();

    expect(scoringService.request).toHaveBeenCalledTimes(1);

    expect(logger.error).not.toHaveBeenCalled();

    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      { count: 1 },
      'Received jobs',
    );

    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      { snsMessageId: expect.any(String) },
      'Scored job',
    );
    expect(logger.info).toHaveBeenNthCalledWith(3, 'Function succeeded');

    expect(distribution).toHaveBeenNthCalledWith(1, 'job.received', 1);
    expect(distribution).toHaveBeenNthCalledWith(2, 'job.scored', 1);

    expect(sns.publish).toHaveBeenCalledTimes(1);
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

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');
  });

  it('bubbles up SNS error', async () => {
    const err = Error(chance.sentence());

    sns.publish.mockPromise(Promise.reject(err));

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');
  });

  it('throws on zero records', async () => {
    const err = new Error('Received 0 records');

    const event = createSqsEvent([]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');
  });

  it('throws on multiple records', async () => {
    const err = new Error('Received 2 records');

    const event = createSqsEvent([
      JSON.stringify(jobPublished),
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).rejects.toThrow('Function failed');

    expect(logger.error).toHaveBeenCalledWith({ err }, 'Function failed');
  });
});
