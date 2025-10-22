import { describe, it } from 'vitest';
import request from 'supertest';

import app from './app.js';

const agent = request.agent(app);

describe('app', () => {
  it('has a happy health check', () => agent.get('/health').expect(200, ''));
});
