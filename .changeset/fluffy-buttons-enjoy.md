---
"skuba": minor
---

lint: Add GitHub check run annotations

`skuba lint` can now automatically annotate GitHub commits when you [propagate Buildkite environment variables and a GitHub API token](https://github.com/seek-oss/skuba/blob/master/docs/deep-dives/github.md#github-annotations). These annotations also appear inline with code under the “Files changed” tab in pull requests.
