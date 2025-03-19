---
'eslint-config-skuba': patch
'skuba': patch
---

deps: pin eslint-config-seek to 14.3.2

This change sets **skuba** to use a known-good version of its dependency set that doesn't clash with the use of `yarn --ignore-optional` in **skuba** projects.

This yarn flag is not recommended by **skuba**. A future version of **skuba** will revert this change, effectively removing support for the flag.
