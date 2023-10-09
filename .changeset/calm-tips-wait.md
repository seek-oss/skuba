---
'skuba': patch
---

template/koa-rest-api: Fix `app.test.ts` assertions

Previously, [custom `.expect((res) => {})` assertions](https://github.com/ladjs/supertest#expectfunctionres-) were incorrectly defined to return false rather than throw an error. The template has been updated to avoid this syntax, but the most straightforward diff to demonstrate the fix is as follows:

```diff
- await agent.get('/').expect(({ status }) => status !== 404);
+ await agent.get('/').expect(({ status }) => expect(status).not.toBe(404));
```
