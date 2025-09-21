---
'skuba': minor
---

lint: Add `minimumReleaseAge` and `minimumReleaseAgeExclude` to `pnpm-workspace.yaml`

These security-focused settings were introduced in [pnpm v10.16](https://github.com/pnpm/pnpm/releases/tag/v10.16.0) to reduce the risk of installing compromised packages. They work by delaying installation of newly released dependencies, giving time for malicious versions to be discovered and removed from the registry.

`minimumReleaseAge` specifies the number of minutes that must pass after a version is published before pnpm will install it. `minimumReleaseAgeExclude` allows you to bypass this restriction for trusted packages, and supports patterns as of [pnpm v10.17.0](https://github.com/pnpm/pnpm/releases/tag/v10.17.0).

**Note:** You must be using pnpm v10.16 or later for `minimumReleaseAge` to work, and pnpm v10.17 or later for `minimumReleaseAgeExclude` patterns to work properly. With earlier versions of pnpm, these features will not function and pnpm will install any version without applying the minimum release age restrictions.
