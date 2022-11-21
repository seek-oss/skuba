import * as jobScorer from 'src/services/jobScorer';

export const scoringService = {
  request: jest.fn(),

  clear: () => scoringService.request.mockClear(),

  spy: () =>
    jest
      .spyOn(jobScorer.scoringService, 'request')
      .mockImplementation(scoringService.request),
};
