import './register';

import app from './app';
import { config } from './config';
import { logger } from './framework/logging';

// This implements a minimal version of `koa-cluster`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use `koa-cluster` to run `lib/app`.

const listener = app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    logger.debug(`listening on port ${address.port}`);
  }
});
