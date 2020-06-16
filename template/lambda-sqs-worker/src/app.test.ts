import { metricsClient } from 'src/framework/metrics';
import { createCtx, createSqsEvent } from 'src/testing/handler';
import { contextLogger } from 'src/testing/logging';
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

  const increment = jest.spyOn(metricsClient, 'increment').mockReturnValue();

  beforeAll(contextLogger.spy);
  beforeAll(scoringService.spy);
  beforeAll(sns.spy);

  beforeEach(() => {
    scoringService.request.mockResolvedValue(score);
    sns.publish.mockPromise(
      Promise.resolve({ MessageId: chance.guid({ version: 4 }) }),
    );
  });

  afterEach(() => {
    contextLogger.clear();
    increment.mockClear();
    scoringService.clear();
    sns.clear();
  });

  it('handles one record', async () => {
    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).resolves.toBeUndefined();

    expect(scoringService.request).toBeCalledTimes(1);

    expect(contextLogger.error).not.toBeCalled();

    expect(contextLogger.info.mock.calls).toEqual([
      [{ count: 1 }, 'received jobs'],
      [{ snsMessageId: expect.any(String) }, 'scored job'],
      ['request'],
    ]);

    expect(increment.mock.calls).toEqual([
      ['job.received', 1],
      ['job.scored', 1],
    ]);

    expect(sns.publish).toBeCalledTimes(1);
  });

  it('throws on invalid input', () => {
    const event = createSqsEvent(['}']);

    return expect(app.handler(event, ctx)).rejects.toThrow('invoke error');
  });

  it('bubbles up scoring service error', async () => {
    const err = Error(chance.sentence());

    scoringService.request.mockRejectedValue(err);

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error).toBeCalledWith({ err }, 'request');
  });

  it('bubbles up SNS error', async () => {
    const err = Error(chance.sentence());

    sns.publish.mockPromise(Promise.reject(err));

    const event = createSqsEvent([JSON.stringify(jobPublished)]);

    await expect(app.handler(event, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error).toBeCalledWith({ err }, 'request');
  });

  it('throws on zero records', async () => {
    const err = new Error('received 0 records');

    const event = createSqsEvent([]);

    await expect(app.handler(event, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error).toBeCalledWith({ err }, 'request');
  });

  it('throws on multiple records', async () => {
    const err = new Error('received 2 records');

    const event = createSqsEvent([
      JSON.stringify(jobPublished),
      JSON.stringify(jobPublished),
    ]);

    await expect(app.handler(event, ctx)).rejects.toThrow('invoke error');

    expect(contextLogger.error).toBeCalledWith({ err }, 'request');
  });
});
