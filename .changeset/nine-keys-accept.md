---
'skuba': patch
---

test: Fix Prettier snapshot formatting

Jest is not yet compatible with Prettier 3, causing snapshot updates to fail with the following error:

```typescript
TypeError: prettier.resolveConfig.sync is not a function
    at runPrettier (node_modules/jest-snapshot/build/InlineSnapshots.js:308:30)
```

Our [Jest preset](https://seek-oss.github.io/skuba/docs/development-api/jest.html#mergepreset) now implements custom formatting as a workaround until [jestjs/jest#14305](https://github.com/jestjs/jest/issues/14305) is resolved.

If you do not use our preset, you can temporarily disable formatting in your `jest.config.ts` then manually run `skuba format` after updating snapshots:

```diff
export default {
+ prettierPath: null,
}
```
