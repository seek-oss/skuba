---
'pnpm-plugin-skuba': major
---

Require pnpm 11

The plugin now enforces stricter security controls and adopts pnpm 11 configuration:

- The config is split into `pnpmfile.v10.mjs` and `pnpmfile.v11.mjs`, exposed as a `defaultConfigs` map keyed by pnpm major version; `pnpmfile.mjs` remains the package entry point and targets pnpm 11
- `strictDepBuilds` is now enforced under pnpm 11
- `trustPolicy` is now enforced as `no-downgrade` under pnpm 11
- `pmOnFail: error` replaces `packageManagerStrictVersion` under pnpm 11
- `ignorePatchFailures: false` is removed as it is now the default
