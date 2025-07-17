import { agentFromApp } from 'src/testing/server.js';

import app from './app.js';

const agent = agentFromApp(app);

describe('app', () => {
  it('exports callback for skuba start', () =>
    expect(app).toHaveProperty('callback'));

  it('has a happy health check', () => agent.get('/health').expect(200, ''));

  it('has a reachable smoke test', () =>
    agent.options('/smoke').expect(200, '').expect('Allow', 'HEAD, GET'));

  it('has a reachable nested route', () =>
    agent.options('/jobs').expect(200, '').expect('Allow', /POST/));

  it('handles an unknown route', () => agent.options('/admin.php').expect(404));
});
