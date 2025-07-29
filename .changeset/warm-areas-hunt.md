---
'skuba': minor
---

**format, lint:** Auto-configures `package.json`, `tsconfig.json` and `jest.config.ts` for ESM migration support by:

1. Adding imports field to `package.json` with custom condition mappings (e.g., @seek/{repo-name}/source)

```json
"imports": {
  "#src/*": {
    "@seek/<%- serviceName %>/source": "./src/*",
    "default": "./lib/*"
  }
},
```

2. Configuring `tsconfig.json` files with custom conditions and removing legacy paths configuration for non-monorepos

```diff
+    "customConditions": ["@seek/<%- serviceName %>/source"],
+    "rootDir": ".",
-    "paths": {
-      "src": ["src"]
-    },
```

3. Setting up Jest `moduleNameMapper` for to map path aliases for monorepos

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
},
```
