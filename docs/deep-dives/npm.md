---
parent: Deep dives
---

# Private npm registry access

---

**skuba** projects at SEEK often need to access private npm packages.
SEEK’s internal [Buildkite](./buildkite.md) setup grants easy access to these packages,
behind a `GET_NPM_TOKEN` environment variable.

Historical setups involved [`private-npm`](http://github.com/seek-oss/private-npm-buildkite-plugin) and [`aws-sm`](https://github.com/seek-oss/aws-sm-buildkite-plugin/).
This document details how to simplify such a setup.

---

## Use with `docker-ecr-cache`

This section of the document assumes use of [pnpm](./pnpm.md).
If using `yarn`, some more work may be needed in some setups.
**skuba** advises migrating to `pnpm` if possible.

`docker-ecr-cache` is very commonly used in SEEK **skuba** projects.
Some **skuba** templates, like `express-koa-api`, come with a `docker-ecr-cache` setup that has this included.
This will look like:

```yaml
# .buildkite/pipeline.yml
configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        secrets:
          # This mounts the provisioned .npmrc file and the NPM_TOKEN environment variable for use in `pnpm fetch`
          - id=npm,src=/var/lib/buildkite-agent/.npmrc
          - NPM_TOKEN

steps:
  - label: Some step
    commands:
      # Private npm access is not needed here; it is only used by `pnpm fetch` in the Dockerfile
      - pnpm install --offline
      - echo "Hello world"
    env:
      # This tells our Buildkite setup to create the .npmrc file and provision the NPM_TOKEN environment variable
      GET_NPM_TOKEN: please
    plugins:
      - *docker-ecr-cache
      - docker-compose#v5.7.0:
          run: app
          environment:
            # Don't pass NPM_TOKEN to the container. It's only needed in docker-ecr-cache.
            - GITHUB_API_TOKEN
          propagate-environment: true
```

```dockerfile

...

WORKDIR /workdir

RUN --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    # Store the .npmrc file out of the working directory
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    # Mount the NPM_TOKEN environment variable
    --mount=type=secret,id=NPM_TOKEN,env=NPM_TOKEN,required=true \
    # This is the only place we need to use the NPM_TOKEN
    pnpm fetch
```

### Migrating

1. Remove any references to `private-npm` or `aws-sm` in your pipeline.
   If you are using `aws-sm` for other secrets, you can keep it (but remove any npm token references).
2. Reconfigure `docker-ecr-cache`'s `secrets` section to include the `npm` and `NPM_TOKEN` secrets.

   <!-- prettier-ignore -->
   ```diff
     seek-oss/docker-ecr-cache#v2.2.1:
       cache-on:
         - .npmrc
         - package.json#.packageManager
         - pnpm-lock.yaml
       dockerfile: Dockerfile.dev-deps
   -   secrets: id=npm,src=/tmp/.npmrc
   +   secrets:
   +     - id=npm,src=/var/lib/buildkite-agent/.npmrc
   +     - NPM_TOKEN
   ```

3. Add the `GET_NPM_TOKEN` environment variable to any step which uses `docker-ecr-cache`.

   ```diff
     steps:
       - label: Some step
         plugins:
          - *docker-ecr-cache
   +     env:
   +       GET_NPM_TOKEN: please
   ```

   🚨 Be wary of any steps which retrieve `env` variables via yaml anchors.

   An example of a mistake:

   ```yaml
   configs:
     prod: &prod
       plugins: [...]
       env:
         ENVIRONMENT: production

   steps:
     - label: Some step
       <<: *prod
       env:
         # 🚨🚨🚨 This will override the ENVIRONMENT variable from the prod anchor
         GET_NPM_TOKEN: please
   ```

   In order to avoid this, you could:

   - Reduce indirection with the YAML anchors, and put all environment variables inline in the step
   - Put `GET_NPM_TOKEN` in the `configs` section too

4. Update your Dockerfile to use the new secrets.

   ```diff
     RUN --mount=type=bind,source=.npmrc,target=.npmrc \
         --mount=type=bind,source=package.json,target=package.json \
         --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
         --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
   +     --mount=type=secret,id=NPM_TOKEN,env=NPM_TOKEN,required=true \
   +     pnpm fetch
   ```

---

## Other setups

Other setups are likely to look similar, but are not covered here.
Review the [internal npm documentation](https://backstage.myseek.xyz/docs/default/component/artifact-management-docs/npm/access/).
