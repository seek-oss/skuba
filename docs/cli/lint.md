---
parent: CLI
nav_order: 5
---

# Lint code

---

SEEK's Technical Guidelines [prescribe ESLint] for code analysis and the [eslint-config-seek] preset in particular.
**skuba** uses a combination of [ESLint], [Prettier] and [tsc] to enforce code quality.

See our [ESLint deep dive] for guidance on resolving linting issues and customising linting rules.

---

## skuba format

Applies automatic code quality fixes and flags issues that require manual intervention.

This command should be run locally before pushing code to a remote branch.

```shell
skuba format

# ESLint
# Processed X files in 1.23s.
#
# Prettier
# Processed X files in 1.23s.
```

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

---

## skuba lint

Checks for code quality issues.

This command should be run in CI to verify that [`skuba format`] was applied and triaged locally.

```shell
skuba lint

# ESLint   │ Processed 123 files in 1.23s.
# Prettier │ Processed 123 files in 1.23s.
# tsc      │ TSFILE: /lib/tsconfig.tsbuildinfo
# tsc      │ tsc --noEmit exited with code 0
```

`skuba lint` runs operations concurrently up to your [CPU core count].
On a resource-constrained Buildkite agent,
you can limit this with the `--serial` flag.

| Option     | Description                                      |
| :--------- | :----------------------------------------------- |
| `--debug`  | Enable debug console output (implies `--serial`) |
| `--serial` | Force serial execution of linting operations     |

[GitHub autofixes] are enabled when CI and GitHub environment variables are present.

### Annotations

`skuba lint` can automatically emit annotations in CI.

- [Buildkite annotations] are enabled when Buildkite environment variables and the `buildkite-agent` binary are present.
- [GitHub annotations] are enabled when CI and GitHub environment variables are present.

[`skuba format`]: #skuba-format
[Buildkite annotations]: ../deep-dives/buildkite.md#buildkite-annotations
[CPU core count]: https://nodejs.org/api/os.html#os_os_cpus
[eslint deep dive]: ../deep-dives/eslint.md
[eslint-config-seek]: https://github.com/seek-oss/eslint-config-seek
[ESLint]: https://eslint.org/
[GitHub annotations]: ../deep-dives/github.md#github-annotations
[GitHub autofixes]: ../deep-dives/github.md#github-autofixes
[prescribe ESLint]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346041/#TypeScript
[Prettier]: https://prettier.io/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
