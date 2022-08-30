---
'skuba': minor
---

deps: eslint-plugin-jest 27

This major release includes breaking changes. See the [release note](https://github.com/jest-community/eslint-plugin-jest/releases/tag/v27.0.0) for more information.

The `jest/no-alias-methods` rule is now [enforced](https://github.com/jest-community/eslint-plugin-jest/pull/1221) and [autofixed](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) to discourage usage of alias methods that will be [removed in Jest 30](https://github.com/facebook/jest/issues/13164).

```diff
- .toBeCalled()
+ .toHaveBeenCalled()
```
