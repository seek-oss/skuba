import { agentFromRouter } from 'src/testing/server.js';

import { jobRouter } from './index.js';

const agent = agentFromRouter(jobRouter);

describe('getJobsHandler', () => {
  it('provides no results on first load', () => agent.get('/').expect(200, []));
});
