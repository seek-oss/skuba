---
parent: CLI
nav_order: 5
---

# Lint code

---

**skuba** uses a combination of [ESLint], [Prettier] and [tsc] to enforce code quality.

---

## skuba format

Applies automatic code quality fixes and flags issues that require manual intervention.

This command should be run locally before pushing code to a remote branch.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

---

## skuba lint

Checks for code quality issues.

This command should be run in CI to verify that [`skuba format`] was applied and triaged locally.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

[`skuba format`]: #skuba-format
[eslint]: https://eslint.org/
[prettier]: https://prettier.io/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
