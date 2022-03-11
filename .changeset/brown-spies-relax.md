---
"skuba": patch
---

template: Disable type checking in tests

Newly initialised projects will skip TypeScript type checking on `skuba test` as it's already covered by `skuba lint`. You can now iterate on your tests without running into annoying compilation errors like TS6133 (unused declarations).

This will be defaulted for existing projects in a future major version. You can opt in early by setting the `globals` configuration option in your `jest.config.ts`:

```typescript
export default Jest.mergePreset({
  globals: {
    'ts-jest': {
      // seek-oss/skuba#626
      isolatedModules: true,
    },
  },
  // Rest of config
})
```
