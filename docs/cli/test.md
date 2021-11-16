---
parent: CLI
nav_order: 4
---

# Test code

---

**skuba** bundles [Jest] as its testing framework.
SEEK has standardised on Jest across frontend and backend development.

---

## skuba test

Executes Jest tests.

Arguments are passed through to the Jest CLI:

```shell
skuba test --coverage path/to/file.test.ts
```

### GitHub Annotations

`skuba test` can automatically emit annotations in CI. [Github Annotations] are enabled when CI and GitHub environment variables are present.

Check runs with annotations are created with the default title `skuba/test` and can be customised further by using the [displayName] field available in Jest config files.

eg. `displayName: "integration"` will render `skuba/test (integration)` in the GitHub UI.

If this field is left blank the title will default to `skuba/test`.

#### Multiple Test Runs

In order to display annotations for different `skuba test` calls in a single pipeline run, provide a unique `displayName` for each test run.

eg. Unit Tests and Integration Tests which can be run with the following commands

`skuba test --config jest.config.ts`

`skuba test --config jest.config.int.ts`

```typescript
// jest.config.ts
import { Jest } from './src';

export default Jest.mergePreset({
  testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
});
```

```typescript
// jest.config.int.ts
import { Jest } from './src';

export default Jest.mergePreset({
  displayName: 'integration',
  testPathIgnorePatterns: ['/test\\.ts'],
});
```

This will create two separate GitHub check runs with annotations `skuba/test` and `skuba/test (integration)`.

Alternatively, you can also declare [projects] with unique [displayName] fields in a single Jest config file.

```typescript
// jest.config.ts
import { Jest } from './src';

export default Jest.mergePreset({
  testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
  projects: [
    Jest.mergePreset({
      displayName: 'integration',
      testPathIgnorePatterns: ['/test\\.ts'],
    }),
  ],
});
```

[displayname]: https://jestjs.io/docs/configuration#displayname-string-object
[github annotations]: ../deep-dives/github.md#github-annotations
[jest]: https://jestjs.io
[projects]: https://jestjs.io/docs/configuration#projects-arraystring--projectconfig
