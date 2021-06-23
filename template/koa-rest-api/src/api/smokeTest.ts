import { smokeTestJobStorage } from 'src/storage/jobs';
import { Middleware } from 'src/types/koa';

/**
 * Tests connectivity to ensure appropriate access and network configuration.
 */
export const smokeTestHandler: Middleware = async (ctx) => {
  await Promise.all([smokeTestJobStorage()]);

  ctx.body = 'Smoke test passed';
};
