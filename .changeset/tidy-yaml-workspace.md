---
'skuba': minor
---

lint: Sort skuba-managed entries in `pnpm-workspace.yaml`

Within each skuba-managed setting such as `publicHoistPattern` and `allowBuilds`, skuba-managed entries are now sorted alphabetically at the top, and any entries you've added are kept in their original order below them. Top-level settings keep their existing order, and new settings are appended to the end of the file.

`pnpm-workspace.yaml` is now patched with the [`yaml`](https://github.com/eemeli/yaml) package, so user comments and quoting are preserved more reliably.

Your next `skuba lint` may report that `pnpm-workspace.yaml` is out of date. Run `skuba format` to reorder it.
