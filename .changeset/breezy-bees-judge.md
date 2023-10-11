---
'skuba': minor
---

test: Propagate root config to `projects` array in `Jest.mergePreset`

`Jest.mergePreset` now propagates the `transform`and`moduleNameMapper`options from the root config preset to the`projects` array.

If you were refencing the base config in the `projects` array

```ts
const baseConfig = Jest.mergePreset({
  ...
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
}
```

You can replace it with the following config:

```ts
export default Jest.mergePreset({
  ...
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
})
```

The `projects` option can allow you to reuse a single Jest config file for different test types. View the [Jest documentation](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) for more information.
