---
'skuba': major
---

pkg: Remove Yarn support

**skuba** now manages pnpm projects exclusively. Package manager detection, the Yarn output filters, and Yarn-specific lockfile handling have been removed, and all internal commands run against pnpm.

Projects still using Yarn 1.x should migrate to pnpm before upgrading. See [Migrating from Yarn 1.x to pnpm](https://seek-oss.github.io/skuba/docs/deep-dives/pnpm.html#migrating-from-yarn-1x-to-pnpm).
