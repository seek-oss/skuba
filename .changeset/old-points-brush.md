---
"skuba": minor
---

lint: Autofix in CI

`skuba lint` can now automatically push ESLint and Prettier autofixes. This lets us introduce new autofixable linting rules and version upgrades without requiring a manual `skuba format` on each project.

You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.
