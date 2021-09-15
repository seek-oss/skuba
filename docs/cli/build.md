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

---

## skuba build

Compiles your project.

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

[`smt build`]: ../migration-guides/seek-module-toolkit.md#building
[`skuba configure`]: ./configure.md#skuba-configure
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
