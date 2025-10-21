---
'skuba-dive': major
---

Remove `skuba-dive/register`

This has been replaced with native subpath imports supported by both [TypeScript](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports) and [Node.js](https://nodejs.org/api/packages.html#subpath-imports) as a part of our ESM migration. Please upgrade `skuba` to version 13 or later to take advantage of this.
