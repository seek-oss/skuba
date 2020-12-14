import express from 'express';

export = express().use((req, res) => {
  if (req.path === '/express') {
    return res.end('Express!');
  }

  res.status(404).end();
});
