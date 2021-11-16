---
parent: Deep dives
---

# GitHub

---

GitHub is the predominant Git host used at SEEK.

This topic details GitHub integration features baked into **skuba**.

---

## GitHub annotations

**skuba** can annotate the first 50 issues detected by [`skuba lint`] and [`skuba test`] via the [GitHub Checks API].

This can be enabled by propagating Buildkite environment variables and a GitHub API token (at SEEK, this token can be configured through Build Agency).
For example, with the Docker plugin:

```yaml
steps:
  - command: yarn lint
    plugins:
      - *aws-sm
      - *private-npm
      - *docker-ecr-cache
      - docker#v3.8.0:
          environment:
            # Enable GitHub annotation support.
            - BUILDKITE
            - BUILDKITE_BUILD_NUMBER
            - GITHUB_API_TOKEN
          volumes:
            # Mount cached dependencies.
            - /workdir/node_modules
```

With Docker Compose,
declare the environment variables and volume mounts in your [Compose file]:

```yaml
services:
  app:
    environment:
      # Enable GitHub annotation support.
      - BUILDKITE
      - BUILDKITE_BUILD_NUMBER
      - GITHUB_API_TOKEN
    volumes:
      - ./:/workdir
      # Mount cached dependencies.
      - /workdir/node_modules
```

If you're running in GitHub Actions,
propagate the following environment variables to achieve the same effect:

- `CI` or `GITHUB_ACTIONS`
- `GITHUB_JOB`
- `GITHUB_RUN_NUMBER`
- `GITHUB_TOKEN`

**skuba**'s development API includes a [GitHub.createCheckRun] function.
You can use this to create your own check runs from other JavaScript code running in your CI workflow.

---

[`skuba lint`]: ../cli/lint.md#skuba-lint
[`skuba test`]: ../cli/test.md#skuba-test
[github.createcheckrun]: ../development-api/github.md#createCheckRun
[github checks api]: https://docs.github.com/en/rest/reference/checks/
[compose file]: https://docs.docker.com/compose/compose-file
[docker buildkite plugin]: https://github.com/buildkite-plugins/docker-buildkite-plugin
