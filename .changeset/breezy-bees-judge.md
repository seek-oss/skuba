---
'skuba': minor
---

Jest.mergePreset: Propagate root-level configuration options to `projects`

[`Jest.mergePreset`](https://seek-oss.github.io/skuba/docs/development-api/jest.html#mergepreset) now propagates the `moduleNameMapper` and `transform` options from root-level configuration to the `projects` array.

If you were referencing the base config in the `projects` array:

```ts
const baseConfig = Jest.mergePreset({
  // ...
});

export default {
  ...baseConfig,
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testMatch: ['**/*.int.test.ts'],
    },
  ],
};
```

You can replace it with the following:

```ts
export default Jest.mergePreset({
  // ...
  projects: [
    {
      displayName: 'unit',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
    },
    {
      displayName: 'integration',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testMatch: ['**/*.int.test.ts'],
    },
  ],
});
```

The `projects` option allows you to reuse a single Jest config file for different test types. View the [Jest documentation](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) for more information.
