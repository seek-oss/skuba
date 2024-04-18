import type { Handler } from 'express';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
export const smokeTestHandler: Handler = (_req, res) => {
  res.send('');
};
