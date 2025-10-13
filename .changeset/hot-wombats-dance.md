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

As part of this migration, this will also update your `tsconfig*.json`, `package.json`, `jest.config*.ts`, `serverless*.yml`, `Dockerfile*` and CDK infra files to support these new imports.

If your Jest configuration has differed from the standard `skuba` configuration, you may need to manually update your `moduleNameMapper` to support these new imports:

```typescript
  moduleNameMapper: {
    '^#src/(.*)\\.js$': [
      '<rootDir>/src/$1',
    ],
    '^#src/(.*)$': [
      '<rootDir>/src/$1',
    ],
  },
```

If you are working in a monorepo:

```typescript
  moduleNameMapper: {
    '^#src/(.*)\\.js$': [
      '<rootDir>/apps/api/src/$1',
      '<rootDir>/apps/worker/src/$1',
    ],
    '^#src/(.*)$': [
      '<rootDir>/apps/api/src/$1',
      '<rootDir>/apps/worker/src/$1',
    ],
  },
```

Please manually verify that your deployments (e.g. Serverless Framework, CDK, Docker) are correctly handling these new imports as there may be some edge cases that need manual intervention.
