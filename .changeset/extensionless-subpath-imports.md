---
'skuba': minor
---

lint: Strip extensions from subpath imports

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
