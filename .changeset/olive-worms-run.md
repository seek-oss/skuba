---
'skuba': patch
---

template/koa-rest-api: Use [AsyncLocalStorage](https://nodejs.org/docs/latest-v16.x/api/async_context.html#asynchronous-context-tracking) to track logger context

We now employ [RequestLogging.createContextStorage](https://github.com/seek-oss/koala/blob/master/src/requestLogging/README.md#context-logging) to thread logging context through the middleware stack of your Koa application. This enables use of a singleton `logger` instance instead of manually propagating Koa context and juggling `rootLogger`s and `contextLogger`s.

Before:

```typescript
import createLogger from '@seek/logger';
import Koa from 'koa';
import { RequestLogging } from 'seek-koala';
const rootLogger = createLogger();
const contextLogger = (ctx: Context) =>
  rootLogger.child(RequestLogging.contextFields(ctx));
const app = new Koa().use((ctx) => {
  rootLogger.info('Has no context');
  contextLogger(ctx).info('Has context');
});
```

After:

```typescript
import createLogger from '@seek/logger';
import Koa from 'koa';
import { RequestLogging } from 'seek-koala';
const { createContextMiddleware, mixin } =
  RequestLogging.createContextStorage();
const contextMiddleware = createContextMiddleware();
const logger = createLogger({ mixin });
const app = new Koa().use(contextMiddleware).use((ctx) => {
  logger.info('Has context');
});
```
