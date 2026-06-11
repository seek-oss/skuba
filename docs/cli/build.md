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

## Bundling assets

To bundle additional assets alongside your build, add an `assets` field inside the `skuba` section within your `package.json`.

```json
{
  "skuba": {
    "entryPoint": "src/index.ts",
    "template": "koa-rest-api",
    "type": "application",
    "version": "8.1.0",
    "assets": ["**/*.vocab/*translations.json"]
  }
}
```

In this example, all `*.vocab/*translations.json` files found within `src` will be copied into the corresponding `lib` directory.

---

## skuba build-package

Compiles your project with [tsdown] to produce CJS, ESM, and type declaration outputs.

This is useful for building isomorphic npm packages.

`tsdown` selects what ECMAScript target version to build for based on the `engines.node` field in your `package.json`.

```shell
skuba build-package

# ℹ entry: src/index.ts
# ℹ target: node22.14.0
# ℹ [CJS] lib/index.cjs
# ℹ [CJS] lib/index.d.cts
# ℹ [ESM] lib/index.mjs
# ℹ [ESM] lib/index.d.mts
```

Assets can be bundled by configuring the [copy] field in the `tsdown.config.mts` file. Depending on your how your application interprets asset paths, the `unbundle` option may need to be set to `true`.

```ts
import { defineConfig } from 'tsdown/config';

export default defineConfig({
  unbundle: true,
  copy: ['**/*.vocab/*translations.json'],
});
```

[`skuba configure`]: ./configure.md#skuba-configure
[compiler option]: https://www.typescriptlang.org/docs/handbook/compiler-options.html#compiler-options
[copy]: https://tsdown.dev/reference/api/Interface.UserConfig#copy
[esbuild]: ../deep-dives/esbuild.md
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[tsdown]: https://tsdown.dev/
