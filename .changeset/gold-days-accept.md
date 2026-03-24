---
'eslint-config-skuba': major
---

Migrate from `eslint-config-seek/base` to `eslint-config-seek/vitest/base`

This package now ships Vitest ESLint rules instead of Jest rules. If you are consuming `eslint-config-skuba` directly, you will need to defer this upgrade until your codebase has migrated to Vitest and ESM.
