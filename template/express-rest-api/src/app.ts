import 'skuba-dive/register';

import express, { Application, Request, Response } from 'express';

import { config } from './config';
import { rootLogger } from './framework/logging';

const app: Application = express();

app.get('/', (_req: Request, res: Response) => {
  rootLogger.debug('greeting...');

  res.send('Hello World!');
});

app.get('/health', (_req: Request, res: Response) => {
  res.send('');
});

export default Object.assign(app, {
  port: config.port,
});
