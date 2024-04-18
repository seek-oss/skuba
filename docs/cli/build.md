---
parent: CLI
nav_order: 6
---

# Build code

---

**skuba** uses [tsc] or [esbuild] to transpile your TypeScript source code to JavaScript output.

The resulting output can be executed with a regular Node.js runtime,
or in the case of packages,
consumed in other projects without the need for additional transpilation.

See our [esbuild] topic for further deliberation over our choice of build tool.

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
  "include": ["src/**/*"],
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "lib",
  },
  "exclude": ["lib*/**/*"],
}
```

Run [`skuba configure`] if you don't already have this file.

With tsc, you can supply any [compiler option] with the following caveats:

1. Long-form option names must use a double `--` prefix rather than a single `-` prefix
2. Complex configurations make it difficult to port your project between build tools

With esbuild, you can supply the following options:

| Option      | Description                               |
| :---------- | :---------------------------------------- |
| `--debug`   | Enable debug console output               |
| `--project` | Point to a different `tsconfig.json` file |

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

`skuba build-package` runs operations concurrently up to your [CPU core count].
On a resource-constrained Buildkite agent,
you can limit this with the `--serial` flag.
See our [Buildkite guide] for more information.

| Option     | Description                                      |
| :--------- | :----------------------------------------------- |
| `--serial` | Force serial execution of compilation operations |

[`smt build`]: ../migration-guides/seek-module-toolkit.md#building
[`skuba configure`]: ./configure.md#skuba-configure
[buildkite guide]: ../deep-dives/buildkite.md
[compiler option]: https://www.typescriptlang.org/docs/handbook/compiler-options.html#compiler-options
[cpu core count]: https://nodejs.org/api/os.html#os_os_cpus
[esbuild]: ../deep-dives/esbuild.md
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
