import type { Handler } from 'express';

/**
 * Signifies that the API is available to serve requests.
 *
 * The deployment environment calls this endpoint to see if the container is
 * unhealthy and needs to be recycled.
 */
export const healthCheckHandler: Handler = (_req, res) => {
  res.send('');
};
