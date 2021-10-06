---
parent: Deep dives
---

# Babel

---

**skuba** currently uses [tsc] as its compiler of choice.
This topic provides some context around this decision and discusses how Babel stacks up as an alternative.

---

## Background

> ["Using the TypeScript compiler is still the preferred way to build TypeScript."](https://devblogs.microsoft.com/typescript/typescript-and-babel-7/)

The official TypeScript compiler ([tsc]) is the sensible default for building TypeScript projects.
It's a simple tool that _just works_ and has type checking built-in,
but [doesn't expose a plugin system].
(See [ttypescript] for an unofficial implementation).

[Babel] is a JavaScript compiler that is particularly useful in the frontend space.
It lets you write modern or even experimental JavaScript,
then compiles your source down to a wider-supported baseline for better browser compatibility.
While this use case is lost on backend applications that can solely target modern Node.js runtimes,
Babel also brings with it a macro and plugin ecosystem for transforming code during the build process.

There are a few downsides to building TypeScript projects with Babel:

- Babel strips type information rather than checking it,
  so in practice it is often paired with `tsc`.

  (`skuba lint` already type-checks via `tsc`,
  so a `skuba build` without type checking would be acceptable.)

- It's another moving part in the toolchain that can and will lag behind TypeScript itself.

  A cherry-picked example would be TypeScript 3.8's [type-only imports and exports].
  It took about a month for Babel 7.9 to land support for this syntax.

- It [doesn't support all TypeScript language features].

That said, Babel presents a few potential benefits for **skuba**:

- Module aliases can be easily configured and resolved at compile time.

  **skuba**'s existing `tsc`-based build supports a single `src` alias via [skuba-dive]'s [register hook],
  which means we impose an unfortunate runtime dependency.
  The way that this hook must be imported is a bit magic and makes it difficult to execute arbitrary TypeScript source files,
  as the hook must be loaded before any aliased imports.

  (This is a big part of why **skuba** has the concept of an explicit entry point for a project.)

- `ts-jest` can be dropped in favour of Jest's built-in Babel support,
  along with duplicated module alias configuration.

- Code generation can be integrated into the build process.
  A neat example of this is [typecheck.macro],
  which generates runtime validators from TypeScript types that would ordinarily be stripped away at compile time.

---

## ~~Try it out~~

> 🗑 This refers to functionality removed in [**skuba** v3.15.0].

1. `babel.config.js`

   ```js
   module.exports = {
     presets: [require.resolve('skuba/config/babel')],
   };
   ```

1. `package.json`

   ```jsonc
   {
     "skuba": {
       "babel": true
     }
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

   (**skuba** is likely to default this option to true in a future release.)

1. ...and that's it!

   ```shell
   # uses Babel instead of tsc
   yarn build

   # uses Nodemon + babel-node instead of ts-node-dev
   yarn start
   ```

---

## ~~Current limitations~~

> 🗑 This refers to functionality removed in [**skuba** v3.15.0].

1. Babel [doesn't support all TypeScript language features].

1. Module alias support is hardcoded to `src`.

1. Build command is hardcoded to input directory `src` and output directory `lib`.

1. The `babel-node` REPL is fairly primitive.
   While it can import TypeScript modules,
   it does not support interactive TypeScript nor modern JavaScript syntax:

   ```typescript
   import { someExport } from 'src/someModule';
   // Thrown: [...] Modules aren't supported in the REPL

   const { someExport } = require('src/someModule');
   // Thrown: [...] Only `var` variables are supported in the REPL

   var { someExport } = require('src/someModule');
   // undefined

   var v: undefined;
   // Thrown: [...] Unexpected token
   ```

[babel]: https://babeljs.io/
[doesn't expose a plugin system]: https://github.com/Microsoft/TypeScript/issues/14419
[doesn't support all typescript language features]: https://babeljs.io/docs/en/babel-plugin-transform-typescript#caveats
[register hook]: https://github.com/seek-oss/skuba-dive#register
[skuba-dive]: https://github.com/seek-oss/skuba-dive
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[ttypescript]: https://github.com/cevek/ttypescript
[type-only imports and exports]: https://devblogs.microsoft.com/typescript/announcing-typescript-3-8/#type-only-imports-exports
[typecheck.macro]: https://github.com/vedantroy/typecheck.macro
[**skuba** v3.15.0]: https://github.com/seek-oss/skuba/releases/tag/v3.15.0
