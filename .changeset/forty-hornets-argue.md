---
'skuba': patch
---

tsconfig: Turn off [`noUnusedLocals`](https://www.typescriptlang.org/tsconfig#noUnusedLocals) and [`noUnusedParameters`](https://www.typescriptlang.org/tsconfig#noUnusedParameters)

[SEEK's ESLint config](https://github.com/seek-oss/eslint-config-seek) has a [rule](https://eslint.org/docs/latest/rules/no-unused-vars) which works for both function and types. We do not need both tools to do the same thing and ESLint has better support for ignoring files if needed.
