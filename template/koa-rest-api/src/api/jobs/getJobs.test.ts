import { describe, it } from 'vitest';
import { jobRouter } from './index.js';

import { agentFromRouter } from '#src/testing/server.js';

const agent = agentFromRouter(jobRouter);

describe('getJobsHandler', () => {
  it('provides no results on first load', () => agent.get('/').expect(200, []));
});
