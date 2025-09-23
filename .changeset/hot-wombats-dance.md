---
'skuba': major
---

**lint/test:** Update `src` imports to use native TypeScript subpath imports

This removes all `skuba-dive/register` imports and replaces them with native TypeScript subpath imports using `#src/*` and

```typescript
// Before
import 'skuba-dive/register';
import { getAccountInfo } from 'src/services/accounts.js';

// After
import { getAccountInfo } from '#src/services/accounts.js';
```

As part of this migration, this will also update your `tsconfig.json`, `tsconfig.build.json`, `package.json` and `jest.config.ts` files to support these new imports.

Please manually verify that your `skuba build` and `skuba test` commands still work as expected as there may be some edge cases that need to be manually resolved.
