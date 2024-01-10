---
'skuba': minor
---

lint: Overhaul skuba's internal linting system

Internal (skuba) linting is now promoted to a top-level tool alongside ESLint, tsc, and Prettier.

This fixes issues where skuba would not fail a `lint` check but silently make changes.
These changes may never end up being committed and causes noise when running `lint` or `format` later.

Now, lints report whether changes need to be made and are applied in `format` or autofix modes (in CI).

In addition, `skuba lint` can now automatically push autofixes. This eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`.

You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.
