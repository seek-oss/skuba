---
'skuba': minor
---

api, lint, migrate, test: Use Vitest globals by default

skuba's dependency hoisting setup is incompatible with TypeScript's import suggestion system, so new test files won't receive Intellisense suggestions for `vitest` imports until it is imported manually in the test file.

To address this limitation we now use Vitest's globals by default

This patch will automatically remove Vitest imports from all test files.

If your `vitest.config.ts` files are using the `Vitest.mergePreset` function, you should not need to update anything.

However, if you have custom `vitest.config.ts` files, or are using `projects` without the `extends: true` option, you may need to update your config to use Vitest's globals.

```diff
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
+   globals: true,
  },
});
```
