import { agentFromRouter } from 'src/testing/server';
import { mockJobInput } from 'src/testing/types';

import { jobRouter } from '.';

const agent = agentFromRouter(jobRouter);

beforeAll(agent.setup);

afterAll(agent.teardown);

describe('getJobsHandler', () => {
  it('provides no results on first load', () => {
    const jobInput = mockJobInput();

    return agent().get('/').send(jobInput).expect(200, []);
  });
});
