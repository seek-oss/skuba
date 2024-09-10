---
'skuba': major
---

release: Remove command

The `skuba release` command has been removed. If you were using it, install `semantic-release`, e.g. `pnpm i -D semantic-release` or `yarn add -D semantic-release`.
Then, replace your use of `skuba release` with `semantic-release --success false`:

```diff
-    "release": "pnpm --silent build && skuba release",
+    "release": "pnpm --silent build && semantic-release --success false",
```

The reason for this change is that the `skuba release` command is a very thin wrapper over semantic-release, and many SEEK projects are moving to be powered by Changesets.
This removes skuba's bundle size for consumers who do not need the package, and allows skuba to maintain a longer support for Node.js LTS versions that semantic-release has historically dropped early.
