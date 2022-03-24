---
'skuba': minor
---

lint: Autofix in CI

`skuba lint` can now automatically push ESLint and Prettier autofixes. This eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`.

You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.
