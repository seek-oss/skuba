import 'aws-sdk-client-mock-jest';

import { PublishCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

import { sns as snsClient } from 'src/services/aws';
import * as jobScorer from 'src/services/jobScorer';

export const scoringService = {
  request: jest.fn(),

  clear: () => scoringService.request.mockClear(),

  spy: () =>
    jest
      .spyOn(jobScorer.scoringService, 'request')
      .mockImplementation(scoringService.request),
};

const snsMock = mockClient(snsClient);

export const sns = {
  publish: snsMock.on(PublishCommand),

  clear: () => snsMock.resetHistory(),

  client: snsMock,
};
