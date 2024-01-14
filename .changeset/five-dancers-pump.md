---
'skuba': minor
---

lint: Overhaul internal linting system

Previously, internal lint rules would not fail a `skuba lint` check but would silently make changes to your working tree. These changes may have never been committed and may have caused subsequent noise when running `skuba format` or `skuba lint`.

Now, internal linting is now promoted to a top-level tool alongside ESLint, Prettier, and tsc. Rules will report whether changes need to be made, and changes will only be applied in `format` or autofix modes (in CI). As a consequence, `skuba lint` may fail upon upgrading to this version if your project has internal lint violations that have been left unaddressed up to this point.

You can configure `skuba lint` to automatically push autofixes; this eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`. You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.
