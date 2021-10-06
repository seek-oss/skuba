---
"skuba": patch
---

Jest.mergePreset: No-longer mutates underlying defaults

Calls to `Jest.mergePreset` no-longer mutates the internal jest-preset object. Subsequence calls to `Jest.mergePreset` will no-longer return results merged in from previous calls.

**Warning:** If you rely on mutating the core jest-preset object for later access with this call this is a _Breaking Change_.
