---
parent: CLI
nav_order: 6
---

# Build code

---

**skuba** uses [tsc] to transpile your TypeScript source code to JavaScript output.

The resulting output can be executed with a regular Node.js runtime,
or in the case of packages,
consumed in other projects without the need for additional transpilation.

See our [Babel topic] for further deliberation over our choice of build tool.

---

## skuba build

Compiles your project.

```shell
skuba build

# TSFILE: ...
```

By convention, this points to a `tsconfig.build.json` that excludes tests from your production bundle.

```jsonc
// tsconfig.build.json
{
  "exclude": ["**/__mocks__/**/*", "**/*.test.ts", "src/testing/**/*"],
  "extends": "tsconfig.json",
  "include": ["src/**/*"]
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "lib"
  },
  "exclude": ["lib*/**/*"]
}
```

Run [`skuba configure`] if you don't already have this file.

---

## skuba build-package

Compiles your project for compatibility with CommonJS and ES2015 modules.

This is useful for building isomorphic npm packages, and serves as a replacement for [`smt build`].

```shell
skuba build-package

# commonjs │ TSFILE: ...
# commonjs │ tsc exited with code 0
# es2015   │ TSFILE: ...
# es2015   │ tsc exited with code 0
# types    │ TSFILE: ...
# types    │ tsc exited with code 0
```

`skuba lint` runs operations concurrently up to your [CPU core count].
On a resource-constrained Buildkite agent,
you can limit this with the `--serial` flag.
See our [Buildkite guide] for more information.

| Option     | Description                                      |
| :--------- | :----------------------------------------------- |
| `--serial` | Force serial execution of compilation operations |

[`smt build`]: ../migration-guides/seek-module-toolkit.md#building
[`skuba configure`]: ./configure.md#skuba-configure
[babel topic]: ../deep-dives/babel.md
[buildkite guide]: ../deep-dives/buildkite.md
[cpu core count]: https://nodejs.org/api/os.html#os_os_cpus
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
