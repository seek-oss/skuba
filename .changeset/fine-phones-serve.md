---
'skuba': minor
---

start: Support named `app` export

`skuba start` now resolves a named `app` export as a request listener, in addition to the existing default export.

```ts
// works with both `export default` and `export const app = ...`
export const app = new Koa().use(/* ... */);
```
