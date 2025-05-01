---
'skuba': minor
---

template/\*: Use simplified npm private access

This change to templates removes [`private-npm`](https://github.com/seek-oss/private-npm-buildkite-plugin/) and [`aws-sm`](https://github.com/seek-oss/aws-sm-buildkite-plugin/) Buildkite plugins, instead using the `GET_NPM_TOKEN` environment variable helper.

Read more at **skuba**’s new [npm guide](https://seek-oss.github.io/skuba/docs/deep-dives/npm.html).
