import './register';

import express from 'express';

import { config } from './config';
import { healthCheckHandler } from './api/healthCheck';
import { smokeTestHandler } from './api/smokeTest';

const app = express()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler);

export default Object.assign(app, {
  port: config.port,
});
