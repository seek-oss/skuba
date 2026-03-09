---
'skuba': minor
---

lint: Restore managed `pnpm-workspace.yaml` sections

This patch restores sections of `pnpm-workspace.yaml` that were previously removed in the previous release because Renovate is not fully compatible with pnpm config dependencies.

These new managed sections should allow for greater flexibility than the previous configurations. Please reach out if you run into any issues.
