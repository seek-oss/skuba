---
'skuba': major
---

lint: Enable [`allowBuilds`](https://pnpm.io/settings#allowbuilds), [`trustPolicy`](https://pnpm.io/settings#trustpolicy), [`blockExoticSubdeps`](https://pnpm.io/settings#blockexoticsubdeps) and [`ignorePatchFailures`](https://pnpm.io/cli/patch#ignorepatchfailures) in `pnpm-plugin-skuba`

In light of recent security vulnerabilities plaguing the JavaScript ecosystem, we are enabling some additional pnpm features to help mitigate the risk of supply chain attacks.

We have allowlisted a set of known packages as our default but you may need to update your `pnpm-workspace.yaml` configuration to add any additional packages you use that are not included in the default allowlist.

Example:

```yaml
allowBuilds:
  some-package: true
  some-other-package@1.0.0: true

trustPolicyExclude:
  - some-package@1.2.3
```
