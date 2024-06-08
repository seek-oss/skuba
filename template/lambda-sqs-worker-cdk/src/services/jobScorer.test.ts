import { scoringService } from 'src/testing/services';
import { chance, mockJobPublishedEvent } from 'src/testing/types';

import * as jobScorer from './jobScorer';

describe('scoreJobPublishedEvent', () => {
  beforeAll(scoringService.spy);

  afterEach(scoringService.clear);

  it('scores an event', async () => {
    const score = chance.floating({ max: 1, min: 0 });

    scoringService.request.mockResolvedValue(score);

    await expect(
      jobScorer.scoreJobPublishedEvent(
        mockJobPublishedEvent({ entityId: '1' }),
      ),
    ).resolves.toStrictEqual({
      data: {
        score,
      },
      entityId: '1',
      eventType: 'JobScored',
    });

    expect(scoringService.request).toHaveBeenCalledTimes(1);
  });

  it('bubbles up scoring service error', async () => {
    const err = Error(chance.sentence());

    scoringService.request.mockRejectedValue(err);

    await expect(
      jobScorer.scoreJobPublishedEvent(
        mockJobPublishedEvent({ entityId: '1' }),
      ),
    ).rejects.toThrow(err);

    expect(scoringService.request).toHaveBeenCalledTimes(1);
  });
});
