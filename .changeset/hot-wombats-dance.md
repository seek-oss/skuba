---
'skuba': major
---

build, lint, test: Replace `src` aliases with `#src` subpath imports

This patch rewrites `src` module aliases dependent on CommonJS monkeypatching via `skuba-dive/register`. The new, ESM-compatible `#src` approach is enabled by Node.js [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) and TypeScript [custom conditions](https://www.typescriptlang.org/tsconfig/#customConditions).

```typescript
// Before
import 'skuba-dive/register';
import { getAccountInfo } from 'src/services/accounts.js';

// After
import { getAccountInfo } from '#src/services/accounts.js';
```

The following files will be updated to support the new subpath pattern:

- `tsconfig*.json`
- `package.json`
- `jest.config*.ts`
- `serverless*.yml`
- `Dockerfile*`
- CDK infrastructure files

#### Troubleshooting

##### Jest configuration

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
    // ...
  ],
  '^#src/(.*)$': [
    '<rootDir>/apps/api/src/$1',
    '<rootDir>/apps/worker/src/$1',
    // ...
  ],
},
```

##### TypeScript errors with `pure-parse` types

If you encounter TypeScript errors related to `pure-parse` types:

```bash
tsc      │ node_modules/@seek/logger/lib-types/eeeoh/eeeoh.d.ts(2,15): error TS2305: Module '"pure-parse"' has no exported member 'Infer'.
tsc      | node_modules/pure-parse/dist/index.d.ts(1,15): error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.
```

Upgrade `@seek/logger` to version 11.2.1 or later:

```bash
pnpm update --latest @seek/logger
```

##### Custom conditions error

If you see the error:

```bash
Option 'customConditions' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 'bundler'
```

Packages should not publish with `node16` module resolution until their consumers have migrated themselves. We recommend the following workaround in the interim:

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
