---
'skuba': minor
---

api, lint, migrate, test: Use Vitest globals by default

skuba's dependency hoisting setup is incompatible with TypeScript's import suggestion system, so new test files won't receive Intellisense suggestions for `vitest` imports until it is imported manually in the test file. To address this limitation, we now use Vitest globals by default.

This release contains a patch to automatically remove Vitest imports from test files. If your `vitest.config.ts` files use the `Vitest.mergePreset` function, you should not need to make any further changes. However, if you have custom `vitest.config.ts` files, or are using `projects` without the `extends: true` option, you may need to manually update your Vitest config to enable globals.

```diff
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
+   globals: true,
  },
});
```
