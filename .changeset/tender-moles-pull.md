---
'skuba': minor
---

lint: Add a graceful SIGTERM handler to `koa-rest-api` services

`skuba format` now prepares services created from the `koa-rest-api` template for a migration to Automat by adding a graceful SIGTERM handler to `src/listen.ts`. The new handler stops accepting connections, drains in-flight requests, flushes spans, and falls back to a hard exit after 25 seconds.

This is latent on Gantry: ECS drains connections before sending SIGTERM, so the service shuts down sooner and more cleanly but otherwise serves traffic as before.

The patch supports two tracing setups:

- **OpenTelemetry:** The SIGTERM handler moves from `src/tracing.ts` into `src/listen.ts`, which shuts down the exported OpenTelemetry SDK before exiting.

- **dd-trace:** When `src/listen.ts` first imports a `src/register.ts` that initialises `dd-trace`, the handler lets the process exit on its own after draining so `dd-trace` can flush spans on `beforeExit`. If another handle keeps the process alive, it exits 5 seconds later, after `dd-trace`'s periodic flush.

The patch only applies when `src/listen.ts`, `src/tracing.ts` or `src/register.ts`, and the `Dockerfile` still match the template, ignoring comments, formatting, and the logger and `app` import names. It skips the whole repository if it finds anything it cannot account for, such as:

- Another reference to `SIGTERM`
- `@seek/otel-tracing`, LaunchDarkly, `datadog-metrics` or buffered StatsD metrics
- `dd-trace` alongside OpenTelemetry, or a customised `dd-trace` flush interval
- Another entry point that loads `tracing.js`

Apply these changes manually if your service is skipped. See the Automat migration guidance on SIGTERM handlers.
