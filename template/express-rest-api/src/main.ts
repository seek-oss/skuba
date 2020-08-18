import { Application, Request, Response } from 'express';
import express = require('express');

const app: Application = express();

app.get('/', function (_req: Request, res: Response) {
  res.send('Hello World!');
});

app.get('/health', function (_req: Request, res: Response) {
  res.send('');
});

if (process.env.ENVIRONMENT !== 'test') {
  app.listen(3000);
}

export default app;
