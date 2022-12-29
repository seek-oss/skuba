---
'skuba': patch
---

lint: Exclude internal files from autofix commits

`skuba lint` now avoids committing the following internal files in a [GitHub autofix](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes):

- `.npmrc`
- `Dockerfile-incunabulum`
