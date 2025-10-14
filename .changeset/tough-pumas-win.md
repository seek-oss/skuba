---
'skuba': major
---

**build/lint:** Update `skuba/config/tsconfig.json` `moduleResolution` from `node` to `node16` and `module` from `commonjs` to `node20`

You may notice some incompatibility issues with existing libraries. This is typically because some libraries do not offer compatible CJS types.

eg.

```bash
node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/addDays.d.cts:1:46 - error TS1541: Type-only import of an ECMAScript module from a CommonJS module must have a 'resolution-mode' attribute.
```

To resolve this you can either:

1. Add a `// @ts-ignore` comment above the import statement. (These can be removed once we have fully migrated to ESM).

```typescript
// @ts-ignore - date-fns does not support Node16 module resolution, remove this when we move to ESM.
import { addDays } from 'date-fns';
```

2. Add `skipLibCheck: true` to your `tsconfig.json` compiler options.

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```
