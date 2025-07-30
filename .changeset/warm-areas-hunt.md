---
'skuba': minor
---

**format, lint:** Auto-configures `package.json`, `tsconfig.json` and `jest.config.ts` for ESM migration support.

## Manual changes that may be required

If you get this Jest error:

```
TypeError: A dynamic import callback was invoked without --experimental-vm-modules
```

Add this to your `pnpm-workspace.yaml`:

```yaml
nodeOptions: '${NODE_OPTIONS:- } --experimental-vm-modules'
```

Or add the node options to the beginning of your test command inside `package.json`.

## Automated changes

1. **Package.json imports field** with custom condition mappings:

   ```json
   "imports": {
     "#src/*": {
       "@seek/<%- serviceName %>/source": "./src/*",
       "default": "./lib/*"
     }
   }
   ```

2. **TypeScript config** with custom conditions and cleaned up paths:

   ```diff
   +    "customConditions": ["@seek/<%- serviceName %>/source"],
   +    "rootDir": ".",
   -    "paths": {
   -      "src": ["src"]
   -    },
   ```

3. **Jest moduleNameMapper** for monorepos:
   ```typescript
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
   }
   ```
