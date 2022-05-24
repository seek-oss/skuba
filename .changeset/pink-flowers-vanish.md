---
'skuba': patch
---

template/lambda-sqs-worker: Use [AsyncLocalStorage](https://nodejs.org/docs/latest-v16.x/api/async_context.html#asynchronous-context-tracking) to track logger context

We now employ this Node.js API to thread logging context through the handler of your Lambda function. This enables use of a singleton `logger` instance instead of manually propagating Lambda context and juggling `rootLogger`s and `contextLogger`s, and is equivalent to #864.

Before:

```typescript
import createLogger from '@seek/logger';
import { Context } from 'aws-lambda';

const rootLogger = createLogger();

const contextLogger = ({ awsRequestId }: Context) =>
  rootLogger.child({ awsRequestId });

const handler = async (_event: unknown, ctx: Context) => {
  rootLogger.info('Has no context');

  contextLogger(ctx).info('Has context');
};
```

After:

```typescript
import { AsyncLocalStorage } from 'async_hooks';

import createLogger from '@seek/logger';
import { Context } from 'aws-lambda';

const loggerContext = new AsyncLocalStorage<{ awsRequestId: string }>();

const logger = createLogger({
  mixin: () => loggerContext.getStore() ?? {},
});

const handler = (_event: unknown, { awsRequestId }: Context) =>
  loggerContext.run({ awsRequestId }, async () => {
    logger.info('Has context');
  });
```
