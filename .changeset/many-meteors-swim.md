---
'pnpm-plugin-skuba': minor
'skuba': minor
---

lint: Hoist `@skuba-lib/*` and `@changesets/cli`

This allows you to use both `@changesets/cli` and [`@skuba-lib/changesets-changelog`](https://github.com/seek-oss/skuba/tree/main/packages/changesets-changelog) in your project without having to install them as direct dependencies.

`package.json`:

```diff
  {
    "devDependencies": {
-     "@changesets/cli": "2.31.0",
-     "@changesets/get-github-info": "0.8.0",
-     "@skuba-lib/changesets-changelog": "1.0.1",
      "skuba": "16.2.0"
    }
  }
```

`@skuba-lib/changesets-changelog` is a direct replacement for `@changesets/get-github-info` and provides a more opinionated changelog generator that is suitable for skuba-managed projects.

`.changeset/config.json`:

```diff
  {
    "changelog": [
-     "@changesets/get-github-info",
+     "@skuba-lib/changesets-changelog",
      { "repo": "SEEK-Jobs/my-repo" }
    ]
  }
```
