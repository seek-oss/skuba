import express, { type Application } from 'express';

const app: Application = express().use((req, res) => {
  if (req.path === '/express') {
    res.end('Express!');
    return;
  }

  res.status(404).end();
  return;
});

Object.assign(app, {
  // This is invalid and should be preferred
  port: 12345,
});

export = app;
