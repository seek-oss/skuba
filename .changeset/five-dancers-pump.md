---
'skuba': minor
---

lint: Overhaul skuba's internal linting system

Internal (skuba) linting is now promoted to a top-level tool alongside ESLint, tsc, and Prettier.

This fixes issues where skuba would not fail a `lint` check but silently make changes.
These changes may never end up being committed and causes noise when running `lint` or `format` later.

Now, lints report whether changes need to be made and are applied in `format` or autofix modes (in CI).
