---
'skuba': minor
---

lint: Replace Prettier with Oxfmt

`skuba lint` and `skuba format` now use Oxfmt instead of Prettier. Benchmarks show Oxfmt to be up to 30x faster.

Oxfmt may format some code differently from Prettier, so you may see diffs in existing files.

skuba will attempt to auto-migrate your Prettier configuration to Oxfmt. Any manual calls to `prettier` in any scripts will need to be manually replaced with `oxfmt`.

Update your VS Code settings to use the [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) extension instead of Prettier:

```diff
 {
   "[typescript]": {
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": "explicit"
     },
-    "editor.defaultFormatter": "esbenp.prettier-vscode"
+    "editor.defaultFormatter": "oxc.oxc-vscode",
+    "editor.formatOnSave": true
   }
 }
```

You may need to reload the IDE for formatting to work after the migration is complete.

`oxfmt` and `oxc-config-seek` are now hoisted in place of `prettier`.
