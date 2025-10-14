---
'skuba': major
---

build, lint: Update default module and module resolution

Our base TypeScript configuration file in `skuba/config/tsconfig.json` has been updated with modern options for module [output format](https://www.typescriptlang.org/docs/handbook/modules/reference.html#the-module-compiler-option) and [resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html#the-moduleresolution-compiler-option):

```diff
  {
    "compilerOptions": {
-     "module": "commonjs",
-     "moduleResolution": "node",
+     "module": "node20",
+     "moduleResolution": "node16",
      // ...
    }
  }
```

## Troubleshooting

Your project may depend on third-party packages with TypeScript types that are not strictly compatible with CommonJS. This may cause `skuba build` and `skuba lint` to fail type checking:

```bash
node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/addDays.d.cts:1:46 - error TS1541: Type-only import of an ECMAScript module from a CommonJS module must have a 'resolution-mode' attribute.
```

To work around such errors, you can either:

1. Add a `// @ts-ignore` comment above the import statement. (These can be removed once we have fully migrated to ESM).

   ```diff
   + // @ts-ignore - date-fns does not support Node16 module resolution, remove this when we move to ESM.
     import { addDays } from 'date-fns';
   ```

2. Add `skipLibCheck: true` to your `tsconfig.json` compiler options.

   ```diff
     {
       "compilerOptions": {
   +     "skipLibCheck": true,
         // ...
       }
     }
   ```
