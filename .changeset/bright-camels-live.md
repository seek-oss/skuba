---
'skuba': major
---

build-package: Migrate to tsdown

As part of our [migration to ESM](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html), we are updating our package build process to support generating both CJS and ESM outputs, regardless of whether projects use CJS or ESM. Since our current tsc-based build does not support this, we are switching to [tsdown](https://tsdown.dev/) for package builds.
