import { agentFromApp } from 'src/testing/server';

import app from './app';

const agent = agentFromApp(app);

describe('app', () => {
  it('exports callback for skuba start', () =>
    expect(app).toHaveProperty('callback'));

  it('has a happy health check', () => agent.get('/health').expect(200, ''));

  it('has a reachable smoke test', () =>
    agent.get('/smoke').expect(({ status }) => {
      if (status === 404) {
        throw new Error('Unreachable smoke test');
      }
    }));

  it('has a reachable nested route', () =>
    agent.get('/jobs').expect(({ status }) => {
      if (status === 404) {
        throw new Error('Unreachable nested route');
      }
    }));

  it('has OPTIONS for a nested route', () =>
    agent.options('/jobs').expect(200).expect('allow', /HEAD/));
});
