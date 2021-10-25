---
parent: Deep dives
---

# Buildkite

---

Buildkite is SEEK's [CI/CD] platform of choice.
See [Builds at SEEK] for more information.

This topic details Buildkite integration features baked into **skuba**,
as well as common issues faced when running your project on a Buildkite agent.

---

## Buildkite annotations

**skuba** can output issues detected by [`skuba lint`] as [Buildkite annotations].

This can be enabled by propagating Buildkite environment variables and the `buildkite-agent` binary.
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
            # Enable Buildkite annotation support.
            - BUILDKITE
            - BUILDKITE_AGENT_ACCESS_TOKEN
            - BUILDKITE_JOB_ID
            - BUILDKITE_STEP_ID
          # Disable SEEK BuildAgency's wrapped agent that requires Bash.
          mount-buildkite-agent: false
          volumes:
            # Mount agent for Buildkite annotations.
            - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
            # Mount cached dependencies.
            - /workdir/node_modules
```

With Docker Compose,
declare the environment variables and volume mounts in your [Compose file]:

```yaml
services:
  app:
    environment:
      # Enable Buildkite annotation support.
      - BUILDKITE
      - BUILDKITE_AGENT_ACCESS_TOKEN
      - BUILDKITE_JOB_ID
      - BUILDKITE_STEP_ID
    volumes:
      - ./:/workdir
      # Mount agent for Buildkite annotations.
      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
      # Mount cached dependencies.
      - /workdir/node_modules
```

This feature is also planned for [`skuba test`] in future.

---

## Buildkite agent exits with status -1

**Scenario:**
you're running a **skuba** command like [`skuba build-package`] or [`skuba lint`],
and observe the following error message on a Buildkite step:

> Exited with status -1 (process killed or agent lost; see the timeline tab for more information)

Navigating to the Timeline tab reveals this:

> **Dispatcher Cancelled Job** (+Xm)
>
> |                          |                             |
> | :----------------------- | :-------------------------- |
> | **Last Agent Heartbeat** | Yesterday at 0:00:00.000 PM |
> | **Command Exit Status**  | `-1 (Agent Lost)`           |

**Explanation:**
This implies that the step(s) exhausted the Buildkite agent's resources.
The agent may be tied up running a particularly compute- or memory-intensive step.

**Options:**

1. Pass the `--serial` flag to [`skuba build-package`] and [`skuba lint`] steps.

   This will cause them to run their underlying operations serially,
   reducing the chance of resource exhaustion.

   Note that this is automatically inferred for builds on SEEK's central npm publishing pipeline.

1. Reduce the number of agents that run on each instance.

   At SEEK, this can be configured through Build Agency.

1. Increase the instance size.

   At SEEK, this can be configured through Build Agency.

[`skuba build-package`]: ../cli/build.md#skuba-build-package
[`skuba lint`]: ../cli/lint.md#skuba-lint
[`skuba test`]: ../cli/test.md#skuba-test
[buildkite annotations]: https://buildkite.com/docs/agent/v3/cli-annotate
[builds at seek]: https://builds-at-seek.ssod.skinfra.xyz/
[ci/cd]: https://en.wikipedia.org/wiki/CI/CD
[compose file]: https://docs.docker.com/compose/compose-file
[docker buildkite plugin]: https://github.com/buildkite-plugins/docker-buildkite-plugin
