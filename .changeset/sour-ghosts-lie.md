---
'skuba': minor
---

lint: Migrate import extensions

`skuba format` now rewrites subpath imports such as `#src/`, `#/` and `#other/` to omit the `.js` extension, and updates the `imports` field of the `package.json` that owns each file so that extensionless imports resolve to `.ts` source files during development and `.js` files in builds:

```diff
- import { module } from '#src/imported-module.js';
+ import { module } from '#src/imported-module';
```

```diff
  "imports": {
    "#src/*": {
-     "@seek/my-repo/source": "./src/*",
+     "@seek/my-repo/source": "./src/*.ts",
-     "default": "./lib/*"
+     "default": "./lib/*.js"
    }
  }
```

Imports with other extensions such as `.json` are left as-is, and a more specific mapping is added for each extension in use:

```diff
  "imports": {
+   "#src/*.json": {
+     "@seek/my-repo/source": "./src/*.json",
+     "default": "./lib/*.json"
+   },
    "#src/*": {
      "@seek/my-repo/source": "./src/*.ts",
      "default": "./lib/*.js"
    }
  }
```

Relative imports that resolve to a `.ts` file are also rewritten to use the `.ts` extension instead of `.js`:

```diff
- import { module } from './imported-module.js';
+ import { module } from './imported-module.ts';
```

Every import in your source code now points at a file that exists on disk, so tooling that understands [custom conditions] can run your TypeScript directly. In particular, you can use Node.js in place of `skuba node` in some places, such as scripts that don't need a REPL or `tsx` features. Pass your repo's custom condition to `--conditions` so that subpath imports resolve to `.ts` source files:

```diff
- skuba node src/script.ts
+ node --conditions=@seek/my-repo/source src/script.ts
```

The same applies to `NODE_OPTIONS`, for tools that spawn Node.js on your behalf:

```shell
NODE_OPTIONS='--conditions=@seek/my-repo/source' node src/script.ts
```

This relies on Node.js [type stripping](https://nodejs.org/api/typescript.html#type-stripping), which requires a recent version of Node.js and the `allowImportingTsExtensions` and `rewriteRelativeImportExtensions` TypeScript compiler options. `skuba node` continues to work as before.

[custom conditions]: https://nodejs.org/api/packages.html#conditional-exports
