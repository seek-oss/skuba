---
'eslint-plugin-skuba': patch
'eslint-config-skuba': patch
---

skuba/no-sync-in-promise-iterable: Improve warning location

Previously, each warning was anchored to the underlying expression that may have thrown a synchronous error, which could be confusing to triage. The rule now emits each warning against the root argument to the static `Promise` method, and includes details about the underlying expression in its message.
