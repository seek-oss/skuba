---
'skuba': patch
---

template: Use `mount-buildkite-agent` for Docker Buildkite plugins

Previously, our templated Buildkite pipelines directly mounted `/usr/bin/buildkite-agent` for [Buildkite annotations](https://seek-oss.github.io/skuba/docs/deep-dives/buildkite.html#buildkite-annotations). This sidestepped a SEEK-specific [`buildkite-signed-pipeline`](https://github.com/buildkite/buildkite-signed-pipeline) wrapper that was not compatible with the default BusyBox Ash shell on Alpine Linux. Projects can now revert to the `mount-buildkite-agent` option with [signed pipelines](https://buildkite.com/docs/agent/v3/signed-pipelines) built in to the Buildkite agent.

For the [Docker Buildkite plugin](https://github.com/buildkite-plugins/docker-buildkite-plugin/blob/v5.13.0/README.md#mount-buildkite-agent-optional-boolean):

```diff
# .buildkite/pipeline.yml
steps:
  - commands:
      - pnpm test
      - pnpm lint
    plugins:
      - *docker-ecr-cache
      - docker#v5.13.0:
          environment:
-           - BUILDKITE_AGENT_ACCESS_TOKEN
            - GITHUB_API_TOKEN
+         mount-buildkite-agent: true
          propagate-environment: true
          volumes:
-           # Mount agent for Buildkite annotations.
-           - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
            # Mount cached dependencies.
            - /workdir/node_modules

```

For the [Docker Compose Buildkite plugin](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin/blob/v5.10.0/README.md#mount-buildkite-agent-run-only-boolean):

```diff
# docker-compose.yml
services:
  app:
-   environment:
-     - BUILDKITE_AGENT_ACCESS_TOKEN
-     - GITHUB_API_TOKEN
    image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
    init: true
    volumes:
      - ./:/workdir
-     # Mount agent for Buildkite annotations.
-     - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
      # Mount cached dependencies.
      - /workdir/node_modules
```

```diff
# .buildkite/pipeline.yml
steps:
  - commands:
      - pnpm test
      - pnpm lint
    plugins:
      - *docker-ecr-cache
      - docker-compose#v5.10.0:
+         environment:
+           - GITHUB_API_TOKEN
+         mount-buildkite-agent: true
          propagate-environment: true
          run: app
```
