---
'skuba-dive': major
---

Remove `skuba-dive/register` and require Node.js 20.9.0 or later.

`skuba-dive/register` has been replaced with native subpath imports supported by both [TypeScript](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports) and [Node.js](https://nodejs.org/api/packages.html#subpath-imports) as a part of our [ESM migration](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html). Please upgrade to [skuba 13](https://github.com/seek-oss/skuba/releases/tag/skuba%4013.0.0) to automatically migrate your codebase.
