---
'skuba': patch
---

template: Include manifest files in CODEOWNERS

Our templates previously excluded `package.json` and `yarn.lock` from CODEOWNERS. This was intended to support advanced workflows such as auto-merging PRs and augmenting GitHub push notifications with custom tooling. However, we are reverting this configuration as it is more common for SEEKers to prefer a simpler CODEOWNERS-based workflow.

This will not affect existing projects. If you create a new project and wish to restore the previous behaviour, you can manually extend `.github/CODEOWNERS`:

```diff
* @<%- ownerName %>

+ # Configured by Renovate
+ package.json
+ yarn.lock
```
