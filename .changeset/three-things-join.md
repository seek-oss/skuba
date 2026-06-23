---
'skuba': patch
---

format, lint: Guard against autofix loops on Renovate lock file updates

Renovate lock file updates (e.g. `renovate/lock-file-maintenance`, `renovate/skuba-0.x-lockfile`) that bump skuba could enter a infinite loop under a specific set of circumstances:

- Project does not pin skuba in `package.json`
- Renovate lock file update bumps skuba to a new version
- New skuba version includes a [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) that further modifies the lock file (e.g. [v16.2.0](https://github.com/seek-oss/skuba/releases/tag/skuba%4016.2.0) removes a `@arethetypeswrong/core@0.18.2>fflate` pnpm override)
- CI runs the patch via `skuba lint` and pushes the lock file change via [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes)
- Renovate detects that the lock file no longer matches the pre-patch state, assumes the branch is stale, and force pushes over it

Now, skuba heuristically detects and avoids lock file autofixes under these circumstances. Pull requests that would previously end up in an autofix loop may be instead left with a stale lock file. To unblock these PRs, install and push the resulting lock file change locally; Renovate will recognise this as a human change and should not force push over it. A more permanent fix is to pin skuba to sidestep the scenario entirely.

```diff
  {
    "devDependencies": {
-     "skuba": "^0.0.0"
+     "skuba": "0.0.0"
    }
  }
```
