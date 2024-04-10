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

This can be enabled by propagating Buildkite environment variables and a GitHub API token.

For example, with the [Docker Buildkite plugin]:

```yaml
steps:
  - commands:
      - pnpm lint
      - pnpm test
    env:
      # At SEEK, this instructs the build agent to populate the GITHUB_API_TOKEN environment variable for this step.
      GET_GITHUB_TOKEN: 'please'
    plugins:
      - *aws-sm
      - *private-npm
      - *docker-ecr-cache
      - docker#v5.10.0:
          # Enable GitHub integrations.
          environment:
            - GITHUB_API_TOKEN
          propagate-environment: true
          volumes:
            # Mount cached dependencies.
            - /workdir/node_modules
```

With Docker Compose, declare the volume mounts in your [Compose file]:

```yaml
services:
  app:
    volumes:
      - ./:/workdir
      # Mount cached dependencies.
      - /workdir/node_modules
```

and the `environment` and `propagate-environment` options in the [Docker Compose Buildkite plugin]:

```yaml
steps:
  - commands:
      - pnpm lint
      - pnpm test
    env:
      # At SEEK, this instructs the build agent to populate the GITHUB_API_TOKEN environment variable for this step.
      GET_GITHUB_TOKEN: 'please'
    plugins:
      - *aws-sm
      - *private-npm
      - *docker-ecr-cache
      - docker-compose#v4.16.0:
          environment:
            - GITHUB_API_TOKEN
          propagate-environment: true
          run: app
```

If you're running in GitHub Actions,
your workflow will automatically have access to the following environment variables to achieve the same effect:

- `GITHUB_ACTIONS`
- `GITHUB_HEAD_REF`
- `GITHUB_JOB`
- `GITHUB_REF_NAME`
- `GITHUB_REF_PROTECTED`
- `GITHUB_RUN_NUMBER`
- `GITHUB_TOKEN`

**skuba**'s development API includes a [GitHub.createCheckRun] function.
You can use this to create your own check runs from other JavaScript code running in your CI workflow.

---

## GitHub autofixes

[`skuba lint`] can generate and push autofixes in CI environments.
This eases adoption of linting rule changes and automatically resolves issues arising from a forgotten [`skuba format`].

CI autofixes can be enabled by:

1. Propagating the environment variables documented above for [GitHub annotations](#github-annotations)
2. Granting repository write access to your CI environment

In Buildkite, your pipeline needs to be configured with write access.
SEEKers should review our internal "Builds at SEEK" documentation relating to the environment variables documented above for [GitHub annotations](#github-annotations).

If you're running in GitHub Actions,
you need to supply a personal access token to [actions/checkout].
Your repository's default `GITHUB_TOKEN` will not suffice as its commits [will not trigger workflows] and will lack (required) status checks.

The following sample is tailored to [seek-oss] projects:

<!-- {% raw %} -->

```yaml
jobs:
  validate:
    steps:
      - name: Check out repo
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.SEEK_OSS_CI_GITHUB_TOKEN || github.com }}

      - name: Set Git user
        run: |
          git config user.name seek-oss-ci
          git config user.email 34733141+seek-oss-ci@users.noreply.github.com

      # Set up Node.js, install dependencies, run tests...

      - name: Lint
        run: pnpm lint
```

<!-- {% endraw %} -->

---

[`skuba format`]: ../cli/lint.md#skuba-format
[`skuba lint`]: ../cli/lint.md#skuba-lint
[`skuba test`]: ../cli/test.md#skuba-test
[actions/checkout]: https://github.com/actions/checkout
[Compose file]: https://docs.docker.com/compose/compose-file
[Docker Buildkite plugin]: https://github.com/buildkite-plugins/docker-buildkite-plugin
[Docker Compose Buildkite plugin]: https://github.com/buildkite-plugins/docker-compose-buildkite-plugin
[GitHub Checks API]: https://docs.github.com/en/rest/reference/checks/
[GitHub.createCheckRun]: ../development-api/github.md#createcheckrun
[seek-oss]: https://github.com/seek-oss
[will not trigger workflows]: https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow
