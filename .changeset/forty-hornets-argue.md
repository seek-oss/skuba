---
'skuba': patch
---

tsconfig: Make noUnusedLocals and noUnusedParameters false

Skuba is already using Seek's ESLint config which has a [rule](https://eslint.org/docs/latest/rules/no-unused-vars) which works for both function and types.
We do not need both tools to do the same thing. ESLint has better support for ignoring files if needed.
