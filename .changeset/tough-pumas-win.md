---
'skuba': major
---

lint: Replace `skuba-dive/register` imports and migrate `src/` path aliases to TypeScript subpath imports

This patch does the following as part of the ECMAScript Modules (ESM) migration:

1. **Removes `skuba-dive/register` imports**: Eliminates import statements for `skuba-dive/register` and relative register imports (e.g., `./register`, `../register`)
2. **Converts src/ aliases to subpath imports**: Transforms `import 'src/*'` statements to `import '#src/*'` using TypeScript's native subpath import mapping

Examples:

```typescript
// Before
import 'skuba-dive/register';
import accounts, { getAccountInfo } from 'src/services/accounts';

// After
import accounts, { getAccountInfo } from '#src/services/accounts';
```

> **Limitation**: This transformation does not handle monorepo scenarios where files in the root directory reference sub-workspace modules using `src/` aliases (e.g., `apps/api/src/*` paths).
