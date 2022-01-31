---
'skuba': patch
---

template/lambda-sqs-worker: Disable `tty` on deploy step

Serverless Framework v3 renders progress spinners on interactive terminals. We recommend disabling [tty](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin#tty-optional-run-only) in CI/CD for cleaner log output.
