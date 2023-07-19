---
'skuba': patch
---

test: Disable Prettier snapshot formatting

Jest is not yet compatible with Prettier 3, causing snapshot updates to fail with the following error:

```typescript
TypeError: prettier.resolveConfig.sync is not a function
    at runPrettier (node_modules/jest-snapshot/build/InlineSnapshots.js:308:30)
```

We have disabled Prettier snapshot formatting in our Jest preset as a temporary workaround. If you do not use the preset, you can manually modify your `jest.config.ts` like so:

```diff
export default {
+ prettierPath: null,
}
```

You may have to run `skuba format` manually after updating snapshots until [jestjs/jest#14305](https://github.com/jestjs/jest/issues/14305) is resolved.
