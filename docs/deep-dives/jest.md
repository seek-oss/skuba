---
parent: Deep dives
---

# Jest

---

## Configuring a single test suite

In the typical case, your project has a single command to run all of its tests:

```console
skuba test --coverage
```

This works well out-of-the-box with the [annotation] features built in to [`skuba test`].

---

## Configuring multiple test suites

If you have multiple test suites in your project,
you may have multiple corresponding config files and commands:

- `skuba test --config jest.config.ts`
- `skuba test --config jest.config.int.ts`

In this scenario, declare unique [displayName]s so that [`skuba test`] can differentiate between the test suites when annotating your builds.

For example, if you set the following display names:

```typescript
// jest.config.ts
import { Jest } from 'skuba';

export default Jest.mergePreset({
  displayName: 'unit',
  testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
});
```

```typescript
// jest.config.int.ts
import { Jest } from 'skuba';

export default Jest.mergePreset({
  displayName: 'integration',
  testPathIgnorePatterns: ['\\.unit\\.test\\.ts'],
});
```

**skuba** will generate two GitHub check runs titled `skuba/test (unit)` and `skuba/test (integration)` respectively.

Alternatively, you can declare multiple [projects] in a single config file:

```typescript
// jest.config.ts
import { Jest } from 'skuba';

export default Jest.mergePreset({
  projects: [
    Jest.mergePreset({
      displayName: 'unit',
      testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
    }),
    Jest.mergePreset({
      displayName: 'integration',
      testPathIgnorePatterns: ['\\.unit\\.test\\.ts'],
    }),
  ],
});
```

[`skuba test`]: ../cli/test.md
[annotation]: ../cli/test.md#annotations
[displayname]: https://jestjs.io/docs/configuration#displayname-string-object
[projects]: https://jestjs.io/docs/configuration#projects-arraystring--projectconfig
