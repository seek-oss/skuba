---
'skuba': major
---

**lint/test:** Update `src` imports to use native TypeScript subpath imports

This upgrade removes all `skuba-dive/register` imports and replaces them with native TypeScript subpath imports using `#src/*` with [custom conditions](https://www.typescriptlang.org/tsconfig/#customConditions).

```typescript
// Before
import 'skuba-dive/register';
import { getAccountInfo } from 'src/services/accounts.js';

// After
import { getAccountInfo } from '#src/services/accounts.js';
```

This migration will automatically update the following files to support the new import pattern:

- `tsconfig*.json`
- `package.json`
- `jest.config*.ts`
- `serverless*.yml`
- `Dockerfile*`
- CDK infrastructure files

### ⚠️ Important: Runtime testing

**You must manually verify that your deployments correctly handle the new `#src/*` imports.** The migration updates build-time configurations, but runtime environments may require additional changes.

> **Critical:** Please test your deployment pipeline in a non-production environment before deploying to production. The automated migration cannot account for all custom deployment configurations.

## Troubleshooting

### Jest configuration

If your Jest configuration differs from the standard `skuba` configuration, you may need to manually update your `moduleNameMapper`:

**Standard projects:**

```typescript
moduleNameMapper: {
  '^#src/(.*)\\.js$': ['<rootDir>/src/$1'],
  '^#src/(.*)$': ['<rootDir>/src/$1'],
},
```

**Monorepo projects:**

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

### TypeScript errors with `pure-parse` types

If you encounter TypeScript errors related to `pure-parse` types, upgrade `@seek/logger` to version 11.2.1 or later.

### Custom conditions error

If you see the error:

```bash
Option 'customConditions' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 'bundler'
```

Our packages cannot publish with the `node16` module resolution yet as the bulk of our repositories have not migrated yet, so we recommend the following workaround:

Create a separate `tsconfig.base.json` that `tsconfig.json` extends. This allows you to apply `customConditions` selectively:

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
