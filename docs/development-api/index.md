---
has_children: true
nav_order: 4
---

# Development API

---

[![npm package](https://img.shields.io/npm/v/@skuba-lib/api?labelColor=cb0000&color=5b5b5b)](https://www.npmjs.com/package/@skuba-lib/api)
[![Node.js version](https://img.shields.io/node/v/@skuba-lib/api?labelColor=5fa04e&color=5b5b5b)](https://www.npmjs.com/package/@skuba-lib/api)

---

**skuba** includes a Node.js API can be used in build and test code.
It includes helpers for interacting with our CI & VCS systems.

The `skuba` package should be a `devDependency` that is excluded from your production bundle.
If your project uses the development API in an internal script at build time,
you can use its convenient re-exports:

```json
{
  "devDependencies": {
    "skuba": "*"
  }
}
```

```typescript
import { GitHub } from 'skuba';

await GitHub.putIssueComment(/* ... */);
```

If your project uses the development API in code that is executed at runtime or included in an npm package,
install the standalone `@skuba-lib/api` package as a `dependency`.
This is good hygiene to avoid a runtime dependency on the larger `skuba` toolkit.

```json
{
  "dependencies": {
    "@skuba-lib/api": "*"
  },
  "devDependencies": {
    "skuba": "*"
  }
}
```

```typescript
import * as GitHub from '@skuba-lib/api/github';

await GitHub.putIssueComment(/* ... */);
```
