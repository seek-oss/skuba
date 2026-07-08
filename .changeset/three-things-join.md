---
'skuba': patch
---

lint: Guard against autofix loops on Renovate lock file updates

Renovate lock file updates that specifically target skuba (`renovate/skuba-0.x-lockfile`) could enter an infinite loop under a specific set of circumstances:

- Project does not pin skuba in `package.json`
- Renovate lock file update bumps skuba to a new version
- New skuba version includes a [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) that further modifies the lock file (e.g. [v16.2.0](https://github.com/seek-oss/skuba/releases/tag/skuba%4016.2.0) removes a `@arethetypeswrong/core@0.18.2>fflate` pnpm override)
- CI runs the patch via `skuba lint`, updates `package.json#/skuba/version`, and pushes the resulting `package.json` and lock file changes via [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes)
- Renovate is triggered by the `package.json` change, detects that the lock file no longer matches the pre-patch state, assumes the branch is stale, and force pushes over it

Now, skuba heuristically detects and avoids lock file autofixes under these circumstances. Pull requests that would previously end up in an autofix loop may be instead left with a stale lock file. To unblock these PRs, install and push the resulting lock file change locally; Renovate will recognise this as a manual change and should not force push over it. A more lasting fix is to pin skuba to sidestep the scenario.

```diff
  {
    "devDependencies": {
-     "skuba": "^0.0.0"
+     "skuba": "0.0.0"
    }
  }
```
