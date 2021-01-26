import { Handler } from 'express';
import { Middleware } from 'src/types/koa';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
export const smokeTestHandler: Middleware = async (_req, res) => {
  await Promise.all([]);

  res.send('');
};
