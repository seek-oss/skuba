---
parent: Deep dives
---

# esbuild

---

**skuba** currently uses [tsc] as its default build tool.
This topic provides some context around this decision and discusses how esbuild stacks up as an alternative.

---

## Background

> ["Using the TypeScript compiler is still the preferred way to build TypeScript."](https://devblogs.microsoft.com/typescript/typescript-and-babel-7/)

The official TypeScript compiler ([tsc]) is the sensible default for building TypeScript projects.
It's a simple tool that _just works_ and has type checking built-in,
but [doesn't expose a plugin system].
(See [ttypescript] for an unofficial implementation).

We have explored a few alternatives:

1. [Babel] was [previously integrated] into **skuba**.

   However, its configuration was complex and largely divergent from a typical TypeScript project,
   and the cost-benefit never really worked out for backend projects.

2. [esbuild] is a bundler and minifier that supports TypeScript transpilation and is now experimentally included in **skuba**.

   It has grown in prominence,
   particularly in frontend tooling like [Vite] that may see broader use at SEEK in future.

3. [swc] is another notable alternative that features in [Next.js] and [Parcel].

There are a couple of gotchas when evaluating alternative build tools like esbuild:

- esbuild strips type information rather than checking it,
  so it is often paired with [tsc] in practice.

  [`skuba lint`] already type checks via [tsc],
  so a [`skuba build`] without type checking is acceptable.
  We still use [tsc] to emit type definitions where requested via `tsconfig.json#/compilerOptions/declaration`.

- It's another moving part in the toolchain.

  esbuild is not fully compatible with all existing `tsc` configurations,
  may lag behind TypeScript in language features,
  and lacks rich interoperability with tooling like Jest (via `ts-jest`) and `ts-node`.

  These issues can be mostly contained within a centralised toolkit like skuba,
  but it makes it more difficult to duct tape tools together on an ad-hoc basis,
  and could lead to inconsistent runtime behaviour across [`skuba build`], [`skuba node`] and [`skuba start`],
  and especially when compared to [tsc].

At the same time, esbuild presents potential benefits for **skuba**:

- Faster and more flexible builds.

  This may allow us to simplify and speed up complex scenarios like [`skuba build-package`].

- Bundling and minification.

  This can be useful to improve cold start performance in serverless environments like AWS Lambda.

- A plugin architecture for transforming code during the build process, along with limited built-in support for `tsconfig.json` paths.

  This allows us to easily configure and resolve module aliases at compile time.

  **skuba**'s existing `tsc`-based build supports a single `src` alias via [skuba-dive]'s [register hook],
  which means we impose an unfortunate runtime dependency.
  The way that this hook must be imported is a bit magic and makes it difficult to execute arbitrary TypeScript source files,
  as the hook must be loaded before any aliased imports.
  (This is a big part of why **skuba** has the concept of an explicit entry point for a project.)

  It also enables interoperability with non-JavaScript content.
  For example, backend projects could `import query from './query.sql'`.
  Such content types are not resolvable by the Node.js runtime,
  but a loader can transform the imports at build time.

---

## Try it out

1. `package.json`

   ```jsonc
   {
     "skuba": {
       "build": "esbuild",
     },
   }
   ```

1. `tsconfig.json`

   ```json
   {
     "compilerOptions": {
       "isolatedModules": true
     }
   }
   ```

   ([**skuba** v5.0.0] defaults this option to true.)

1. ...and that's it!

   ```shell
   # uses esbuild instead of tsc
   pnpm run build
   ```

---

## Current limitations

This integration is still experimental and only includes the bare minimum to supplant a basic [tsc]-based build.

1. Some TypeScript language features are not supported.

   See esbuild's [TypeScript caveats] for more information.

2. esbuild is not wired up to [`skuba build-package`], [`skuba node`] nor [`skuba start`].

3. Bundling and minification are not supported.

[**skuba** v5.0.0]: https://github.com/seek-oss/skuba/releases/tag/v5.0.0
[`skuba build`]: ../cli/build.md#skuba-build
[`skuba build-package`]: ../cli/build.md#skuba-build-package
[`skuba lint`]: ../cli/lint.md#skuba-lint
[`skuba node`]: ../cli/run.md#skuba-node
[`skuba start`]: ../cli/run.md#skuba-start
[babel]: https://babeljs.io/
[doesn't expose a plugin system]: https://github.com/Microsoft/TypeScript/issues/14419
[esbuild]: https://esbuild.github.io/
[next.js]: https://nextjs.org/
[parcel]: https://parceljs.org/
[previously integrated]: ./babel.md
[register hook]: https://github.com/seek-oss/skuba-dive#register
[skuba-dive]: https://github.com/seek-oss/skuba-dive
[swc]: https://swc.rs/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[ttypescript]: https://github.com/cevek/ttypescript
[typescript caveats]: https://esbuild.github.io/content-types/#typescript-caveats
[vite]: https://vitejs.dev/
