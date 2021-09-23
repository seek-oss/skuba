---
parent: CLI
nav_order: 5
---

# Lint code

---

SEEK's Technology Strategy [prescribes ESLint] for code analysis and the [eslint-config-seek] preset in particular.
**skuba** uses a combination of [ESLint], [Prettier] and [tsc] to enforce code quality.

See our [ESLint deep dive] for guidance on resolving linting issues and customising linting rules.

---

## skuba format

Applies automatic code quality fixes and flags issues that require manual intervention.

This command should be run locally before pushing code to a remote branch.

```shell
skuba format

# Fixing code with ESLint
# -----------------------
# Processed X files in 1.23s.
#
# Formatting code with Prettier
# -----------------------------
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

# Prettier | Checking formatting...
# Prettier | All matched files use Prettier code style!
# Prettier | prettier --check . exited with code 0
# ESLint   | eslint --ext=js,ts,tsx --report-unused-disable-directives . exited with code 0
# tsc      | TSFILE: ...
# tsc      | tsc --noEmit exited with code 0
```

`skuba lint` runs processes concurrently up to your [CPU core count].
On a resource-constrained Buildkite agent,
you can limit it to run serially by propagating the `BUILDKITE` environment variable.
See our [Buildkite guide] for more information.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

[`skuba format`]: #skuba-format
[buildkite guide]: ../deep-dives/buildkite.md
[cpu core count]: https://nodejs.org/api/os.html#os_os_cpus
[eslint deep dive]: ../deep-dives/eslint.md
[eslint-config-seek]: https://github.com/seek-oss/eslint-config-seek
[eslint]: https://eslint.org/
[prescribes eslint]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/technology.html#typescript
[prettier]: https://prettier.io/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
