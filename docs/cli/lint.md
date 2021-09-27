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

`skuba lint` automatically emits Buildkite annotations when it detects that Buildkite environment variables and the `buildkite-agent` binary are present.

See our [Buildkite guide] to learn more.

| Option     | Description                                      |
| :--------- | :----------------------------------------------- |
| `--debug`  | Enable debug console output (implies `--serial`) |
| `--serial` | Force serial execution of linting operations     |

[`skuba format`]: #skuba-format
[buildkite guide]: ../deep-dives/buildkite.md
[cpu core count]: https://nodejs.org/api/os.html#os_os_cpus
[eslint deep dive]: ../deep-dives/eslint.md
[eslint-config-seek]: https://github.com/seek-oss/eslint-config-seek
[eslint]: https://eslint.org/
[prescribes eslint]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/technology.html#typescript
[prettier]: https://prettier.io/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
