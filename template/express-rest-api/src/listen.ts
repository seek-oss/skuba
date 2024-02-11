import './register';

import app from './app';
import { config } from './config';
import { rootLogger } from './framework/logging';

// If your application is deployed with more than 1 vCPU you can delete this
// file and use a clustering utility to run `lib/app`.

const listener = app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(`listening on port ${address.port}`);
  }
});

// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;
