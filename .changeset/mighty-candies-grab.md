---
'skuba': minor
---

build/lint: Set `rootDir: '.'` in skuba/config/tsconfig.json

This should have no impact on most projects. However, it should resolve issues such as `error TS2210: The project root is ambiguous, but is required to resolve import map entry 'some-file.js' in file '/workdir/package.json'. Supply the `rootDir` compiler option to disambiguate.` appearing in some monorepo setups
