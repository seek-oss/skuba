---
'skuba': patch
---

lint: Disable `Promise<void>` return checks in tests

This works around the following incompatibility between Koa and the built-in `http.RequestListener` type:

```typescript
const app = new Koa();

const agent = supertest.agent(app.callback());
//                            ~~~~~~~~~~~~~~
// Promise returned in function argument where a void return was expected.
// @typescript-eslint/no-misused-promises
```
