---
'skuba': minor
---

lint: Add `strictDepBuilds`, `onlyBuiltDependencies`, `trustPolicy`, and `trustPolicyExclude` to `pnpm-workspace.yaml`

These security-focused settings were introduced in pnpm v10 to reduce the risk of installing compromised packages by controlling which packages can execute build scripts and preventing trust downgrades.

`strictDepBuilds` (added in [pnpm v10.3](https://github.com/pnpm/pnpm/releases/tag/v10.3.0)) causes installation to fail if any dependencies have unreviewed build scripts. `onlyBuiltDependencies` specifies which packages are allowed to run "preinstall", "install", and "postinstall" scripts during installation - all other packages will be blocked from running these lifecycle scripts.

`trustPolicy` (added in [pnpm v10.21](https://github.com/pnpm/pnpm/releases/tag/v10.21.0)) can be set to `no-downgrade` to prevent installing package versions where the trust level has decreased compared to previous releases. For example, if a package was previously published by a trusted publisher but now only has provenance or no trust evidence, installation will fail. `trustPolicyExclude` (added in [pnpm v10.22](https://github.com/pnpm/pnpm/releases/tag/v10.22.0)) allows you to bypass this restriction for specific packages or versions.

This change also introduces two new overload fields in `package.json` that allow projects to customize these lists:

- `onlyBuiltDependenciesOverload`: Replace the default list of allowed build dependencies
- `trustPolicyExcludeOverload`: Replace the default list of trust policy exclusions

**Note:** You must be using pnpm v10.3 or later for `strictDepBuilds` to work, pnpm v10.21 or later for `trustPolicy` to work, and pnpm v10.22 or later for `trustPolicyExclude` to work. With earlier versions of pnpm, these features will not function.
