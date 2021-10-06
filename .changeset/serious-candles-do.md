---
"skuba": minor
---

Jest.mergePreset: Allow configuration of test environment

[Jest's `testEnvironment`](https://jestjs.io/docs/configuration#testenvironment-string) can now be passed to `Jest.mergePreset`:

```ts
export default Jest.mergePreset({
  testEnvironment: "jsdom",
});
```
