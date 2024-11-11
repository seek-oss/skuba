# <%- repoName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

Next steps:

1. [ ] Finish templating if this was skipped earlier:

   ```shell
   pnpm exec skuba configure
   ```

2. [ ] Create a new repository in the appropriate GitHub organisation.
3. [ ] Add the repository to BuildAgency;
       see our internal [Buildkite Docs] for more information.
4. [ ] Add Datadog extension, deployment bucket configuration and data classification tags to [infra/config.ts](infra/config.ts).
5. [ ] For the smoke test, make sure Lambda has permissions to publish SNS message and configure `sourceSnsTopicArn` in [infra/config.ts](infra/config.ts).
6. [ ] Push local commits to the upstream GitHub branch.
7. [ ] Configure [GitHub repository settings].
8. [ ] Delete this checklist 😌.

[Buildkite Docs]: https://backstage.myseek.xyz/docs/default/component/buildkite-docs
[GitHub repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings

## Design

<%-repoName %> is a Node.js [Lambda] application built in line with our [Technical Guidelines].
It is backed by a typical SQS message + dead letter queue configuration and uses common SEEK packages.
Workers enable fault-tolerant asynchronous processing of events.

The `lambda-sqs-worker-cdk` template is modelled after a hypothetical enricher that scores job advertisements.
It's stubbed out with in-memory [scoring service](src/services/jobScorer.ts).
This would be replaced with internal logic or an external service in production.

This project is deployed with [AWS CDK].
The Lambda runtime provisions a single Node.js process per container.
The supplied [infra/appStack.ts](infra/appStack.ts) starts out with a minimal `memorySize` which may require tuning based on workload.
Under load, we autoscale horizontally in terms of container count up to `reservedConcurrency`.

[@seek/aws-codedeploy-hooks] configures [CodeDeploy] for a blue-green deployment approach.
A smoke test is run against the new version before traffic is switched over,
providing an opportunity to test access and connectivity to online dependencies.
This defaults to an invocation with an empty object `{}`.

## Development

### Test

```shell
# Run Jest tests locally
pnpm test

# Authenticate to dev account
awsauth

# Run smoke test against deployed application
ENVIRONMENT=dev pnpm smoke
```

### Lint

```shell
# Fix issues
pnpm format

# Check for issues
pnpm lint
```

### Start

```shell
# Start a local HTTP server
pnpm start

# Start with Node.js Inspector enabled
pnpm start:debug
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

ENVIRONMENT=dev pnpm run deploy
```

A hotswap deploy enables faster deployment but come with caveats such as requiring a Lambda to be rebuilt with every build.

To deploy a [hotswap]:

```shell
# Authenticate to dev account
awsauth

ENVIRONMENT=dev pnpm run deploy:hotswap
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

[@seek/aws-codedeploy-hooks]: https://github.com/seek-oss/aws-codedeploy-hooks
[AWS CDK]: https://docs.aws.amazon.com/cdk/v2/guide/home.html
[CodeDeploy]: https://docs.aws.amazon.com/codedeploy
[Hotswap]: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html#ref-cli-cmd-deploy-options
[Lambda]: https://docs.aws.amazon.com/lambda
[Technical Guidelines]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346017/
