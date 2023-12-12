---
'skuba': minor
---

lint: Introduce skuba patches

This feature adds patches which are run only once on the `lint` or `format` commands following a skuba update. If your build pipeline is utilising [autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes), this should push any changes up automatixally. This will also bump your skuba manifest version.
