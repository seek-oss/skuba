---
'pnpm-plugin-skuba': patch
'skuba': patch
---

lint: Disable trustPolicy and strictDepBuilds

Due to issues with how `pnpm` parses the `trustPolicy` and `strictDepBuilds` options, we are disabling them temporarily

These will be re-enabled in a future release once the underlying issues have been resolved.
