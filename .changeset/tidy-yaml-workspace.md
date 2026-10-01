---
'skuba': minor
---

lint: Sort skuba-managed entries in `pnpm-workspace.yaml`

Within each skuba-managed setting such as `publicHoistPattern` and `allowBuilds`, skuba-managed entries are now sorted alphabetically at the top, and any entries you've added are kept in their original order below them.

```yaml
publicHoistPattern:
  - eslint-config-skuba # Managed by skuba
  - remark-lint-*
  - '@vitest/*' # Managed by skuba
  - esbuild # Managed by skuba
  # hoisted for Storybook
  - '*storybook*'
  - eslint # Managed by skuba
  - '@types*' # Managed by skuba
```

is rewritten to:

```yaml
publicHoistPattern:
  - '@types*' # Managed by skuba
  - '@vitest/*' # Managed by skuba
  - esbuild # Managed by skuba
  - eslint # Managed by skuba
  - eslint-config-skuba # Managed by skuba
  - remark-lint-*
  # hoisted for Storybook
  - '*storybook*'
```

`pnpm-workspace.yaml` is now patched with the [`yaml`](https://github.com/eemeli/yaml) package, so user comments and quoting are preserved more reliably.

Your next `skuba lint` may report that `pnpm-workspace.yaml` is out of date. Run `skuba format` to reorder it.
