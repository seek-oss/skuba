---
'@skuba-lib/api': minor
'skuba': minor
---

api: Re-export APIs via @skuba-lib/api

The `Buildkite`, `Git`, `Net` and `GitHub` APIs from `skuba` are re-exported through `@skuba-lib/api`, allowing consumers to install a smaller package when they only need the API functionality.

These are exposed through the main `@skuba-lib/api` import or you can access individual modules via sub-paths such as `@skuba-lib/api/buildkite`.
