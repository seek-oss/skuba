import './register';

import app from './app';
import { rootLogger } from './framework/logging';

// This implements a minimal version of `koa-cluster`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use `koa-cluster` to run `lib/app`.

const listener = app.listen(app.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    rootLogger.debug(`listening on port ${address.port}`);
  }
});
