---
has_children: true
nav_order: 2
---

# CLI

---

**skuba** includes a set of CLI commands for developing your project,
which replace direct calls to underlying tooling such as [ESLint] and [tsc].

In other development environments,
you may see common commands and tasks encapsulated in standalone shell scripts,
or build tools like [Make] and [Gradle].

Within the JavaScript ecosystem,
the lowest-friction way of defining reusable scripts is within your [package.json] manifest:

```json
{
  "scripts": {
    "build": "skuba build",
    "format": "skuba format"
  }
}
```

These scripts are executable through your package manager:

```shell
yarn build
yarn format
```

[eslint]: https://eslint.org/
[gradle]: https://gradle.org/
[make]: https://www.gnu.org/software/make/
[package.json]: https://nodejs.dev/learn/the-package-json-guide
[sku]: https://github.com/seek-oss/sku
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
