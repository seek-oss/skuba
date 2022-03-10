import { agentFromRouter } from 'src/testing/server';

import { jobRouter } from '.';

const agent = agentFromRouter(jobRouter);

describe('getJobsHandler', () => {
  it('provides no results on first load', () => agent.get('/').expect(200, []));
});
