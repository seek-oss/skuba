---
'skuba': minor
---

lint: Add patch to prune development dependencies from API Dockerfiles

A new patch automatically upgrades API Dockerfiles so the build stage prunes and
reinstalls production-only dependencies before building. The runtime image keeps
copying `node_modules` from the build stage, so it no longer carries development
dependencies.

This reduces the amount of build tooling and development dependencies carried
through the final image while preserving the existing runtime behaviour.
