---
'skuba': minor
---

lint: Add a graceful SIGTERM handler to `koa-rest-api` services

`skuba format` now prepares services created from the `koa-rest-api` template for a migration to Automat by adding a graceful SIGTERM handler to `src/listen.ts`. The new handler stops accepting connections, drains in-flight requests, flushes spans, and falls back to a hard exit after 25 seconds.

This is latent on Gantry: ECS drains connections before sending SIGTERM, so the service shuts down sooner and more cleanly but otherwise serves traffic as before.

The patch supports three setups:

- **OpenTelemetry:** The SIGTERM handler moves from `src/tracing.ts` into `src/listen.ts`, which shuts down the exported OpenTelemetry SDK before exiting.

- **dd-trace:** The handler lets the process exit on its own after draining so `dd-trace` can flush spans on `beforeExit`. If another handle keeps the process alive, it exits 5 seconds later, within `DD_TRACE_FLUSH_INTERVAL` of the last trace completing. This is also used when the service depends on `dd-trace` or has it preloaded by its Dockerfile without initialising it in a module that `src/listen.ts` imports.

- **No tracer:** The handler exits as soon as the server has drained.

Each package of a monorepo is patched for its own tracer, as each is built into a separate process.

The patch only applies when `src/listen.ts`, `src/tracing.ts` where present, and the `Dockerfile` still match the template, ignoring comments, formatting, module paths, and the identifiers it logs through. It skips a service when it finds anything it cannot account for, such as:

- Another reference to `SIGTERM`
- `@seek/otel-tracing`, LaunchDarkly, `datadog-metrics` or buffered StatsD metrics
- A tracer that does not match the handler it would be given, or a customised `dd-trace` flush interval
- Another entry point that loads `tracing.js`

Apply these changes manually if your service is skipped. See the Automat migration guidance on SIGTERM handlers.
