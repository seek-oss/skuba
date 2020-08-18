import request from 'supertest';

import app from './main';

const agent = request.agent(app);

describe('app', () => {
  it('Hello World!', () => agent.get('/').expect(200, 'Hello World!'));

  it('has a happy health check', () => agent.get('/health').expect(200, ''));
});
