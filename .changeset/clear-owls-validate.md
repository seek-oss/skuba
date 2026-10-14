---
'skuba': patch
---

init: Explain why a template field failed validation

A template `validate` function that returns `false` now reports the field as invalid, including its example when one is set.
