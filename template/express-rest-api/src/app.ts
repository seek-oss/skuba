import express, { Application, Request, Response } from 'express';

const app: Application = express();

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/health', (_req: Request, res: Response) => {
  res.send('');
});

if (process.env.ENVIRONMENT !== 'test') {
  app.listen(3000);
}

export default app;
