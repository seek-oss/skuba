---
'skuba': patch
---

lint: Add patch to migrate Docker and Docker Compose Buildkite plugins to `mount-buildkite-agent`

`skuba lint` now patches projects that mount the Buildkite agent into their Docker or Docker Compose Buildkite plugin to use the [`mount-buildkite-agent`](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin/blob/v5.12.1/README.md#mount-buildkite-agent-run-only-boolean) option instead.

For the Docker Compose Buildkite plugin, the bind mount is removed from `docker-compose.yml`:

```diff
 volumes:
   - ./:/workdir
-  # Mount agent for Buildkite annotations.
-  - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
   # Mount cached dependencies.
   - /workdir/node_modules
```

And `mount-buildkite-agent: true` is added to the plugin in `.buildkite/pipeline.yml`:

```diff
 - docker-compose#v5.10.0:
     environment:
       - GITHUB_API_TOKEN
+    mount-buildkite-agent: true
     propagate-environment: true
     run: app
```

For the Docker Buildkite plugin, the bind mount is removed and [`mount-buildkite-agent`](https://github.com/buildkite-plugins/docker-buildkite-plugin/blob/v5.13.0/README.md#mount-buildkite-agent) is opted in directly in `.buildkite/pipeline.yml`:

```diff
 - docker#v5.13.0:
-    # Disable SEEK BuildAgency's wrapped agent that requires Bash.
-    mount-buildkite-agent: false
+    mount-buildkite-agent: true
     propagate-environment: true
     volumes:
-      # Mount agent for Buildkite annotations.
-      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
       # Mount cached dependencies.
       - /workdir/node_modules
```
