import express from 'express';

const app = express().use((req, res) => {
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

// @ts-expect-error for testing purposes
export = app;
