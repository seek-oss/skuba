import './register';

import express from 'express';

import { healthCheckHandler } from './api/healthCheck';
import { smokeTestHandler } from './api/smokeTest';

const app = express()
  // TODO: consider using a middleware that adds secure HTTP headers.
  // https://github.com/helmetjs/helmet
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler);

export default app;
