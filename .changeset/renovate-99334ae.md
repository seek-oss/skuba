---
'skuba': minor
---

deps: tsdown ~0.23.0

This release contains breaking changes, please see the [release notes](https://github.com/rolldown/tsdown/releases/tag/v0.23.0) for details.

`skuba format` rewrites `attw: true` to `attw: { profile: 'node16' }` so packages keep node16-compatible attw checks instead of picking up tsdown's new `esm-only` default.
