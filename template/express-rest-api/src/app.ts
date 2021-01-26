import './register';

import express from 'express';

import { healthCheckHandler } from './api/healthCheck';
import { smokeTestHandler } from './api/smokeTest';
import { config } from './config';

const app = express()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler);

export default Object.assign(app, {
  port: config.port,
});
