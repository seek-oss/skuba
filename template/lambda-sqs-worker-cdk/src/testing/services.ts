import { vi } from 'vitest';
import 'aws-sdk-client-mock-jest';

import { PublishCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

import { sns as snsClient } from '#src/services/aws.js';
import * as jobScorer from '#src/services/jobScorer.js';

export const scoringService = {
  request: vi.fn(),

  clear: () => scoringService.request.mockClear(),

  spy: () =>
    vi
      .spyOn(jobScorer.scoringService, 'request')
      .mockImplementation(scoringService.request),
};

const snsMock = mockClient(snsClient);

export const sns = {
  publish: snsMock.on(PublishCommand),

  clear: () => snsMock.resetHistory(),

  client: snsMock,
};
