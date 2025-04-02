---
'skuba': minor
---

format: Support a `--force-apply-all-patches` flag in `skuba format` that will apply all patches, even if **skuba** does not detect that you are upgrading to a new version.

This can be useful for backfilling any regressions that previous patches have fixed but have been added to the code later.
