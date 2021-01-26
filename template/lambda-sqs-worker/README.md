# <%- repoName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

Next steps:

1. [ ] Finish templating if this was skipped earlier:

   ```shell
   yarn skuba configure
   ```

2. [ ] Create a new repository in the appropriate GitHub organisation.
3. [ ] Add the repository to BuildAgency;
       see [Builds at SEEK] for more information.
4. [ ] Fill out [.me](.me) to power SEEK's system catalogue;
       see the [Codex] documentation for more information.
5. [ ] Add deployment bucket configuration and data classification tags to [serverless.yml](serverless.yml).
6. [ ] Push local commits to the upstream GitHub branch.
7. [ ] Delete this checklist 😌.

## Table of contents

- [Design](#design)
- [Development](#development)
  - [Test](#test)
  - [Lint](#lint)
  - [Start](#start)
  - [Deploy](#deploy)
- [Support](#support)
  - [Dev](#dev)
  - [Prod](#prod)

## Design

<%-repoName %> is a Node.js [Lambda] application built in line with our [technology strategy].
It is backed by a typical SQS message + dead letter queue configuration and uses common SEEK packages.
Workers enable fault-tolerant asynchronous processing of events.

The `lambda-sqs-worker` template is modelled after a hypothetical enricher that scores job advertisements.
It's stubbed out with in-memory [scoring service](src/services/jobScorer.ts).
This would be replaced with internal logic or an external service in production.

This project is deployed with [Serverless].
The Lambda runtime provisions a single Node.js process per container.
The supplied [serverless.yml](serverless.yml) starts out with a minimal `memorySize` which may require tuning based on workload.
Under load, we autoscale horizontally in terms of container count up to `reservedConcurrency`.

Serverless configures [CodeDeploy] for a blue-green deployment approach.
A smoke test is run against the new version before traffic is switched over,
providing an opportunity to test access and connectivity to online dependencies.
This defaults to an invocation with an empty object `{}`, per [src/hooks.ts](src/hooks.ts).

## Development

### Test

```shell
# Run Jest tests locally
yarn test

# Authenticate to dev account
awsauth

# Run smoke test against deployed application
ENVIRONMENT=dev yarn smoke
```

### Lint

```shell
# Fix issues
yarn format

# Check for issues
yarn lint
```

### Start

```shell
# Start a local HTTP server
yarn start

# Start with Node.js Inspector enabled
yarn start:debug
```

This serves the Lambda application over HTTP.
For example, to invoke the handler with an empty object `{}` for smoke testing:

```shell
curl --data '[{}, {"awsRequestId": "local"}]' --include localhost:<%- port %>
```

### Deploy

This project is deployed through a [Buildkite pipeline](.buildkite/pipeline.yml).

- Commits to a feature branch can be deployed to the dev environment by unblocking a step in the Buildkite UI
- Commits to the default branch are automatically deployed to the dev and prod environments in sequence

To deploy locally:

```shell
# Authenticate to dev account
awsauth

ENVIRONMENT=dev yarn deploy
```

To rapidly roll back a change,
retry an individual deployment step from the previous build in Buildkite.
Note that this will introduce drift between the head of the default Git branch and the live environment;
use with caution and always follow up with a proper revert or fix in Git history.

## Support

### Dev

TODO: add support links for the dev environment.

<!--
- CloudWatch dashboard
- Datadog dashboard
- Splunk logs
-->

### Prod

TODO: add support links for the prod environment.

<!--
- CloudWatch dashboard
- Datadog dashboard
- Splunk logs
-->

[builds at seek]: https://builds-at-seek.ssod.skinfra.xyz
[codedeploy]: https://docs.aws.amazon.com/codedeploy
[codex]: https://codex.ssod.skinfra.xyz/docs
[lambda]: https://docs.aws.amazon.com/lambda
[serverless]: https://www.serverless.com/
[technology strategy]: https://tech-strategy.ssod.skinfra.xyz
