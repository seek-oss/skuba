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

Coming soon!

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
The agent may be tied up running a particularly compute-intensive step.

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
