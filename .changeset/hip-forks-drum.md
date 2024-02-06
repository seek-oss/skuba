---
'skuba': minor
---

init: Initialise new projects with [pnpm](https://pnpm.io/)

New projects based on built-in templates will now use pnpm as their package manager as per updated organisational guidance.

Custom templates will continue to default to Yarn 1.x until a future major version, though you can opt in to pnpm via `skuba.template.js`:

```diff
module.exports = {
+ packageManager: 'pnpm',
};
```
