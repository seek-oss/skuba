import './register';

import express from 'express';

import { healthCheckHandler } from './api/healthCheck';
import { smokeTestHandler } from './api/smokeTest';

const app = express()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler);

export default app;
