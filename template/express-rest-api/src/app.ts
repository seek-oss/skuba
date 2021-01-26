import './register';

import express from 'express';

import { config } from './config';
import { healthCheckHandler } from './api/healthCheck';
import { smokeTestHandler } from './api/smokeTest';

const app = express()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler);

Object.assign(app, { port: config.port });

export default app;
