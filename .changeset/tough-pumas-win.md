---
'skuba': major
---

**lint:** Update Typescript configuration, replace `skuba-dive/register` imports and migrate `src/` path aliases to TypeScript subpath imports as part of the ECMAScript Modules (ESM) [migration](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html):

1. **Removes `skuba-dive/register` imports**: Handled by installing the latest skuba package and running `pnpm format` in your repo. This eliminates absolute and relative register imports (e.g., `./register`, `../register`), and enables `import '#src/*'` native TypeScript subpath imports.

   ```typescript
   // Before
   import 'skuba-dive/register';
   import accounts, { getAccountInfo } from 'src/services/accounts';

   // After
   import accounts, { getAccountInfo } from '#src/services/accounts';
   ```

2. **TypeScript configuration updates**: Requires manual configuration for `package.json` and `tsconfig.json` following the [deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html#transitioning-to-esm). The base `skuba/config/tsconfig.json` is now using `node16` module resolution, and `node18` module.

3. **bonus monorepo manual configuration:** Update `jest.config.ts` to tell Jest how to resolve `#src` imports to the actual file paths in your `src/` directory using `moduleNameMapper`.

   Monorepo example with 2 projects `api` and `worker`:

   ```
     moduleNameMapper: {
       '^(\\.{1,2}/.*)\\.js$': '$1',
       '^#src$': ['<rootDir>/apps/api/src', '<rootDir>/apps/worker/src'],
       '^#src/(.*)\\.js$': [
         '<rootDir>/apps/api/src/$1',
         '<rootDir>/apps/worker/src/$1',
       ],
       '^#src\/(.*)$': [
         '<rootDir>/apps/api/src/$1',
         '<rootDir>/apps/worker/src/$1',
       ],
     },
   ```
