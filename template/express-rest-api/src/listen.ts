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
