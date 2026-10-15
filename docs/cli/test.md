---
parent: CLI
nav_order: 4
---

# Test code

---

**skuba** bundles [Vitest] as its testing framework.
SEEK is currently standardising on Vitest across frontend and backend development.

---

## skuba test

Executes Vitest tests.

Arguments are passed through to the Vitest CLI:

```shell
skuba test --coverage path/to/file.test.ts
```

### Automatic upgrades

When running in CI, `skuba test` attempts to upgrade skuba before running tests.
This applies the latest [patches] so they are in place even when tests run before lint.

Applied changes are committed and pushed when [GitHub autofixes] are enabled.
That push still happens when the follow-up lint is clean.

Make sure GitHub autofixes are enabled so these changes are committed and pushed automatically.

### Annotations

<!--
`skuba test` can automatically emit annotations in CI.

- [GitHub annotations] are enabled when CI and GitHub environment variables are present.

GitHub check runs are created with a default title of `skuba/test`.
You can further qualify this by providing a [displayName] in your Jest config;
for example, the display name `integration` will result in the title `skuba/test (integration)`.

See our [Jest guide] for a more detailed configuration breakdown. -->

[github autofixes]: ../deep-dives/github.md#github-autofixes
[patches]: lint.md#patches
[vitest]: https://vitest.dev
