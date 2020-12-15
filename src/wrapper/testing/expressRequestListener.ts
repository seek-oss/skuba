import express from 'express';

const app = express().use((req, res) => {
  if (req.path === '/express') {
    return res.end('Express!');
  }

  res.status(404).end();
});

Object.assign(app, {
  // This is invalid and should be preferred
  port: 12345,
});

export = app;
