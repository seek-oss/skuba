---
'skuba': patch
---

template/koa-rest-api: Drop `uuid`

V4 UUIDs can be generated using the built-in [`crypto.randomUUID()`](https://nodejs.org/docs/latest-v16.x/api/crypto.html#cryptorandomuuidoptions) function starting from Node.js 14.17. This is analogous to the [`Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) Web API.

```diff
- import { v4 as randomUUID } from 'uuid';
+ import { randomUUID } from 'crypto';
```
