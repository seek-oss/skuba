---
'skuba': minor
---

lint: Migrate tsdown configs to support 0.21

This patch attempts to migrate the `external`, `noExternal`, `inlineOnly` and `skipNodeModulesBundle` fields to their new equivalents and sets `failOnWarn` to `true`.

Read the [tsdown release notes](https://github.com/rolldown/tsdown/releases/tag/v0.21.0) for more information.
