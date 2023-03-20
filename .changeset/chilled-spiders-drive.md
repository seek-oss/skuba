---
'skuba': patch
---

lint: Avoid committing `.npmrc` changes

`skuba lint` can automatically commit codegen changes if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project. Previously we made sure to exclude a new `.npmrc` file from the commit, but we now exclude changes to an existing `.npmrc` too.
