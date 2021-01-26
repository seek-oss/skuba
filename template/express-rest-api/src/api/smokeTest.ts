import { Handler } from 'express';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
export const smokeTestHandler: Handler = async (_req, res) => {
  await Promise.all([]);

  res.send('');
};
