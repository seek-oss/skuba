---
"skuba": patch
---

Jest.mergePreset: Do not mutate underlying defaults

`Jest.mergePreset` no longer mutates the internal `jest-preset` object. Subsequent calls to `Jest.mergePreset` will no longer return results merged in from previous calls.

**Warning:** If you rely on mutating the core `jest-preset` object for later access, this is a _Breaking Change_.
