---
'skuba': major
---

**lint:** Replace `skuba-dive/register` imports and migrate `src/` path aliases to TypeScript subpath imports as part of the ECMAScript Modules (ESM) migration:

1. **Removes `skuba-dive/register` imports**: Eliminates absolute and relative register imports (e.g., `./register`, `../register`)
2. **Converts src/ aliases to subpath imports**: Transforms `import 'src/*'` statements to `import '#src/*'` using TypeScript's native subpath import mapping

   ```typescript
   // Before
   import 'skuba-dive/register';
   import accounts, { getAccountInfo } from 'src/services/accounts';

   // After
   import accounts, { getAccountInfo } from '#src/services/accounts';
   ```

3. **TypeScript configuration updates**: Uses `node16` module resolution for ESM import handling. Outputs ESM modules following `node18` standards, and configures workspace root directory for subpath aliasing:

   ```diff
   {
     "compilerOptions": {
   +   "customConditions": ["<%- serviceName %>/source"],
       "incremental": true,
       "isolatedModules": true,
   -   "moduleResolution": "node",
   +   "moduleResolution": "node16",
   +   "module": "node18",
       "resolveJsonModule": true,
   +   "root": ".",
       "noUnusedLocals": false,
       "noUnusedParameters": false
     },
     "extends": "tsconfig-seek"
   }
   ```

4. **package.json**: Follow the [guide](https://github.com/seek-oss/skuba/blob/main/docs/deep-dives/esm.md#2-replace-skuba-diveregister-with-subpath-imports) to update `package.json ` import paths

5. **monorepo** Update `jest.config.ts` to handle the new subpath imports by adding appropriate `moduleNameMapper` entries. These mappings tell Jest how to resolve `#src` imports to the actual file paths in your `src/` directory.

   Monorepo example:

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
