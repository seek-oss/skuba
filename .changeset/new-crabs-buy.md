---
'skuba': patch
---

templates/\*: Use `propagate-environment` for Docker Compose Buildkite plugin

This simplifies the Docker Compose environment variable configuration which is required for Buildkite and GitHub integrations.

docker-compose.yml:

```diff
services:
  app:
-   environment:
-     # Enable Buildkite + GitHub integrations.
-     - BUILDKITE
-     - BUILDKITE_AGENT_ACCESS_TOKEN
-     - BUILDKITE_BRANCH
-     - BUILDKITE_BUILD_NUMBER
-     - BUILDKITE_JOB_ID
-     - BUILDKITE_PIPELINE_DEFAULT_BRANCH
-     - BUILDKITE_STEP_ID
-     - GITHUB_API_TOKEN
    image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
    init: true
    volumes:
      - ./:/workdir
      # Mount agent for Buildkite annotations.
      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
      # Mount cached dependencies.
      - /workdir/node_modules
```

pipeline.yml:

```diff
steps:
  - commands:
      - pnpm run lint
      - pnpm run test
    env:
      # At SEEK, this instructs the build agent to populate the GITHUB_API_TOKEN environment variable for this step.
      GET_GITHUB_TOKEN: 'please'
    plugins:
      - *aws-sm
      - *private-npm
      - *docker-ecr-cache
      - docker-compose#v4.16.0:
          run: app
          # Enable GitHub integrations.
          environment:
            - GITHUB_API_TOKEN
+         propagate-environment: true
```
