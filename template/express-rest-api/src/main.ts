import express = require('express');
import { Request, Response, Application } from 'express';

const app: Application = express();

app.get('/', function (_req: Request, res: Response) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('App is listening on port 3000!');
});

export default app;
