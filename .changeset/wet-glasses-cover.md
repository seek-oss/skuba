---
'pnpm-plugin-skuba': major
---

Require pnpm 11

The plugin now enforces stricter security controls and adopts pnpm 11 configuration:

- `strictDepBuilds` is now enforced
- `trustPolicy` is now enforced as `no-downgrade`
- `pmOnFail: error` replaces `packageManagerStrictVersion`
- `ignorePatchFailures: false` is removed as it is now the default
