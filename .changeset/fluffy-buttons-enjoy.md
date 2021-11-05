---
"skuba": minor
---

lint: Add GitHub Check Run Annotations

Lint can now automatically add annotations to GitHub commits when you [propagate Buildkite environment variables and a GitHub API token](https://github.com/seek-oss/skuba/blob/master/docs/deep-dives/github.md#github-annotations) to the runtime environment. These annotations will appear in Pull Requests in-line alongside your code changes in the Files Changed Tab.
