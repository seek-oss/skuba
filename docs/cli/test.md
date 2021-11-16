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

### Annotations

`skuba test` can automatically emit annotations in CI.

- [Buildkite annotations] are planned in future.
- [GitHub annotations] are enabled when CI and GitHub environment variables are present.

GitHub check runs are created with a default title of `skuba/test`.
You can further qualify this by providing a [displayName] in your Jest config;
for example, the display name `integration` will result in the title `skuba/test (integration)`.

See our [Jest guide] for a more detailed configuration breakdown.

[displayname]: https://jestjs.io/docs/configuration#displayname-string-object
[github annotations]: ../deep-dives/github.md#github-annotations
[jest]: https://jestjs.io
[jest guide]: ../deep-dives/jest.md
[projects]: https://jestjs.io/docs/configuration#projects-arraystring--projectconfig
