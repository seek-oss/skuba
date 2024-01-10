---
'skuba': minor
---

lint: Overhaul internal linting system

Internal linting is now promoted to a top-level tool alongside ESLint, Prettier, and tsc.

This fixes issues where skuba would not fail a `skuba lint` check but silently make changes to your working tree. These changes may have never been committed and subsequently led to noise when running `skuba format` or `skuba lint`.

Now, internal linting rules report whether changes need to be made, and changes are only applied in `format` or autofix modes (in CI).

In addition, `skuba lint` can now automatically push autofixes. This eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`.

You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.
