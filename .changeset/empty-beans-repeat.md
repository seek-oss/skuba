---
'skuba': minor
---

lint: Add `rootDir` to root tsconfig.json compilerOptions

This should resolve issues such as `error TS2210: The project root is ambiguous, but is required to resolve import map entry 'some-file.js' in file '/workdir/package.json'. Supply the `rootDir` compiler option to disambiguate.` appearing in some monorepo setups.

Ensure you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled to automatically commit and push these changes.
