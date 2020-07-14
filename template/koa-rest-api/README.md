# <%- repoName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

## Table of contents

- [Design](#design)
- [Development](#development)
  - [Test](#test)
  - [Lint](#lint)
  - [Deploy](#deploy)
- [Support](#support)
  - [Dev](#dev)
  - [Prod](#prod)

## Design

TODO: explain the design of your API here.

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

### Deploy

This project is deployed through a [Buildkite pipeline](.buildkite/pipeline.yml).

- Branch commits can be deployed to the dev environment by unblocking a step in the Buildkite UI
- Master commits are automatically deployed to the dev and prod environments in sequence

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
