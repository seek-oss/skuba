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

// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;

process.on('SIGTERM', () => {
  rootLogger.debug('Draining remaining connections');
  listener.close(() => {
    rootLogger.debug('Remaining connections drained');
    // Additional cleanup tasks go here, e.g., close database connection
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  });
});
