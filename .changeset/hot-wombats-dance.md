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

### Common issues

**TypeScript errors related to `pure-parse` types**

If you encounter any TypeScript errors related to `pure-parse` types, please bump your version of `@seek/logger` to 11.2.1 or later.

**Error: `Option 'customConditions' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 'bundler'`**

If you encounter this error, consider creating a separate `tsconfig.base.json` which `tsconfig.json` extends. This allows you to apply `customConditions` only where needed:

**`tsconfig.base.json`:**

```json
{
  "extends": "skuba/config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ES2024",
    "lib": ["ES2024"]
  }
}
```

**`tsconfig.json`:**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "customConditions": ["@seek/YOUR_REPO/source"]
  }
}
```

**`tsconfig.build.json`:**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "lib",
    "rootDir": "src"
  },
  "include": ["src"]
}
```
