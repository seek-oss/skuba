# <%- repoName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

Next steps:

1. [ ] Check if your team has a Graviton-based Buildkite cluster;
       see the [ARM64 guide] for more information.
2. [ ] Finish templating if this was skipped earlier:

   ```shell
   yarn skuba configure
   ```

3. [ ] Create a new repository in the appropriate GitHub organisation.
4. [ ] Add the repository to BuildAgency;
       see [Builds at SEEK] for more information.
5. [ ] Add Datadog configuration and data classification tags to [.gantry/common.yml](.gantry/common.yml);
       see the [Gantry] documentation for more information.
6. [ ] Push local commits to the upstream GitHub branch.
7. [ ] Configure [GitHub repository settings].
8. [ ] Keep dependencies up to date with [Renovate];
       request installation in [SEEK-Jobs/renovate].
9. [ ] Delete this checklist 😌.

[arm64]: https://seek-oss.github.io/skuba/docs/deep-dives/arm64.html
[builds at seek]: https://builds-at-seek.ssod.skinfra.xyz
[github repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings
[renovate]: https://github.com/apps/renovate
[seek-jobs/renovate]: https://github.com/SEEK-Jobs/renovate

## Design

<%-repoName %> is a Node.js HTTP server built in line with our [technology strategy].
It uses the [Koa] middleware framework and common SEEK packages.
Resource APIs enable synchronous interactions and serve as the backbone of SEEK's general service architecture.

The `koa-rest-api` template is modelled after a hypothetical service for posting and retrieving job advertisements.
It's stubbed out with in-memory [storage](src/storage) which can observed by standing up an environment with multiple instances.
Storage is local to each instance, so load balancing across the instances may render a read inconsistent with a previous write.
This would be replaced with an external data store in production.

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

[codedeploy]: https://docs.aws.amazon.com/codedeploy
[gantry]: https://gantry.ssod.skinfra.xyz
[koa]: https://koajs.com
[technology strategy]: https://tech-strategy.ssod.skinfra.xyz
