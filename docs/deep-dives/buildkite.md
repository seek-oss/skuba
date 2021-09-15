---
parent: Deep dives
---

# Buildkite

## My agent exits with status -1

**Scenario:**
you're running some skuba commands like `skuba lint`,
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

1. Propagate the `BUILDKITE` environment variable to `skuba build-package` and `skuba lint` steps.
   This will cause them to run their underlying processes serially,
   reducing the chance of resource exhaustion.

   With the [Docker Buildkite plugin],
   you can achieve this in a couple ways:

   ```yaml
   steps:
     - plugins:
         - docker#v3.7.0:
             # Option 1a: List environment variable explicitly
             environment:
               - BUILDKITE
             # Option 1b: Propagate all pipeline variables
             propagate-environment: true
   ```

   With Docker Compose,
   you can add the variable to your [Compose file]:

   ```yaml
   services:
     app:
       environment:
         - BUILDKITE
   ```

1. Reduce the number of agents that run on each instance.

   At SEEK, this can be configured through Build Agency.

1. Increase the instance size.

   At SEEK, this can be configured through Build Agency.

[compose file]: https://docs.docker.com/compose/compose-file
[docker buildkite plugin]: https://github.com/buildkite-plugins/docker-buildkite-plugin
