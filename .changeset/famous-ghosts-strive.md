---
'skuba': minor
---

configure: Remove `skuba configure`

This command fell out of maintenance as much of its initial intent was superseded by [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) and [patches](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches). For the remaining use cases:

- Projects with a `skuba.template.js` that skipped templating upfront can resume the process with `skuba init`
- Projects scaffolded with a divergent toolchain can align with skuba defaults by providing a coding agent with the context of another skuba-managed project or [template](https://seek-oss.github.io/skuba/docs/templates/)
