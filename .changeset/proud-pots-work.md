---
'skuba': minor
---

lint: Patch `deps` stage into API Dockerfiles

A new patch automatically upgrades API Dockerfiles to use a dedicated production dependency stage. The patch creates a `deps` stage that installs production dependencies, then updates the `runtime` image to copy `node_modules` from that stage instead of the `build` stage.

This reduces the amount of build tooling and development dependencies carried through the final image while preserving existing runtime behaviour.
