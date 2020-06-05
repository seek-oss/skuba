import * as aws from 'src/services/aws';
import * as jobScorer from 'src/services/jobScorer';

export const scoringService = {
  request: jest.fn(),

  clear: () => scoringService.request.mockClear(),

  spy: () =>
    jest
      .spyOn(jobScorer.scoringService, 'request')
      .mockImplementation(scoringService.request),
};

export const sns = {
  publish: Object.assign(jest.fn(), {
    mockPromise: (promise: Promise<unknown>) =>
      sns.publish.mockReturnValue({ promise: () => promise } as any),
  }),

  clear: () => sns.publish.mockClear(),

  spy: () => jest.spyOn(aws.sns, 'publish').mockImplementation(sns.publish),
};
