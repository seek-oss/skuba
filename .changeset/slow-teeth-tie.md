---
'skuba': minor
---

format: Add `--force-apply-all-patches` flag

The new `skuba format --force-apply-all-patches` flag will apply all patches, even if **skuba** does not detect that you are upgrading to a new version. This can be useful for addressing regressions that previous patches would have fixed but were added to the code later.
