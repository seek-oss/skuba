# skuba-dive

## 3.0.0

### Major Changes

- Require Node.js 20.9.0+ ([#2123](https://github.com/seek-oss/skuba/pull/2123))

- Remove `skuba-dive/register` ([#2123](https://github.com/seek-oss/skuba/pull/2123))

  `skuba-dive/register` has been replaced with native subpath imports supported by both [TypeScript](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports) and [Node.js](https://nodejs.org/api/packages.html#subpath-imports) as a part of our [ESM migration](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html). Please upgrade to [skuba 13](https://github.com/seek-oss/skuba/releases/tag/skuba%4013.0.0) to automatically migrate your codebase.
