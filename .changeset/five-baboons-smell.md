---
'skuba': patch
---

lint: Disable `Promise<void>` return checks in tests

This works around an [existing incompatibility](https://github.com/koajs/koa/issues/1755) between Koa and the built-in `http.RequestListener` type:

```typescript
const app = new Koa();

const agent = supertest.agent(app.callback());
//                            ~~~~~~~~~~~~~~
// Promise returned in function argument where a void return was expected.
// @typescript-eslint/no-misused-promises
```
