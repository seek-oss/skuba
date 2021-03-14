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
5. [ ] Add Datadog configuration and data classification tags to [.gantry/common.yml](.gantry/common.yml);
       see the [Gantry] documentation for more information.
6. [ ] Push local commits to the upstream GitHub branch.
7. [ ] Configure [GitHub repository settings].
8. [ ] Keep dependencies updated via [SEEK-Jobs/renovate].
9. [ ] Delete this checklist 😌.

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

<%-repoName %> is a Node.js HTTP server built in line with our [technology strategy].
It uses the [Express] middleware framework and common SEEK packages.
Resource APIs enable synchronous interactions and serve as the backbone of SEEK's general service architecture.

This project is deployed as a containerised application with [Gantry].
A typical resource API instance does not require more than 1 vCPU,
so we eschew clustering configurations in favour of a single Node.js process per container.
Under load, we autoscale horizontally in terms of container count up to `autoScaling.maxCount`.

Gantry configures [CodeDeploy] for a blue-green deployment approach.
A smoke test is run against the new version before traffic is switched over,
providing an opportunity to test access and connectivity to online dependencies.
This defaults to an HTTP request to the `GET /smoke` endpoint.

## Development

### Test

```shell
yarn test
```

### Lint

```shell
# fix
yarn format

# check
yarn lint
```

### Start

```shell
# Start a local HTTP server
yarn start

# Start with Node.js Inspector enabled
yarn start:debug
```

### Deploy

This project is deployed through a [Buildkite pipeline](.buildkite/pipeline.yml).

- Commits to a feature branch can be deployed to the dev environment by unblocking a step in the Buildkite UI
- Commits to the default branch are automatically deployed to the dev and prod environments in sequence

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
[express]: https://expressjs.com
[gantry]: https://gantry.ssod.skinfra.xyz
[github repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings
[seek-jobs/renovate]: https://github.com/SEEK-Jobs/renovate
[technology strategy]: https://tech-strategy.ssod.skinfra.xyz
