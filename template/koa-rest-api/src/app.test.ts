import { agentFromApp } from 'src/testing/server';

import app from './app';

const agent = agentFromApp(app);

describe('app', () => {
  it('exports callback for skuba start', () =>
    expect(app).toHaveProperty('callback'));

  it('has a happy health check', () => agent.get('/health').expect(200, ''));

  it('has a reachable smoke test', async () => {
    const response = await agent.get('/smoke');
    expect(response.status).not.toBe(404);
  });

  /**
   * Test assertion with logic
   */
  it('has a reachable nested route', () =>
    agent.get('/jobs').expect(({ status }) => {
      switch (status) {
        case 200:
          return;
        case 404:
          throw new Error('Unreachable jobs route');
        default:
          throw new Error(`Unexpected status: ${status}`);
      }
    }));

  it('has OPTIONS for a nested route', () =>
    agent.options('/jobs').expect(200).expect('allow', /HEAD/));
});
