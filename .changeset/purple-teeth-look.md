---
'skuba': minor
---

lint: Remove `unbundle` from tsdown configs

When skuba first migrated packages to tsdown, it set `unbundle: true` with a `// TODO: determine if your project can be bundled` comment as a prompt for maintainers to revisit the setting. This patch now automates that follow-up.

The `unbundle` field and its TODO comment will be removed from your `tsdown.config` file if your package does not appear to ship translations (`.vocab` files) or CSS (`.css` files).
