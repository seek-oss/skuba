---
parent: Deep dives
---

# Babel

---

This topic has been reduced to a stub.
Discussion continues in the [esbuild](./esbuild.md) deep dive.

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
       "babel": true,
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
   # uses Babel instead of tsc
   skuba build

   # uses Nodemon + babel-node instead of ts-node-dev
   skuba start
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

[**skuba** v3.15.0]: https://github.com/seek-oss/skuba/releases/tag/v3.15.0
[**skuba** v5.0.0]: https://github.com/seek-oss/skuba/releases/tag/v5.0.0
[doesn't support all typescript language features]: https://babeljs.io/docs/en/babel-plugin-transform-typescript#caveats
