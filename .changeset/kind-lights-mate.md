---
'skuba': patch
---

migrate, lint: Add `--import dd-trace/initialize.mjs` to lambda `NODE_OPTIONS` when handler redirection is disabled

When Datadog handler redirection is turned off (`redirectHandler: false` for CDK,
`redirectHandlers: false` for serverless), Datadog no longer auto-wraps the handler so
dd-trace must be initialised explicitly via the ESM loader flag. The ESM migration now
appends `--import dd-trace/initialize.mjs` to the lambda's `NODE_OPTIONS` in this case,
and a new upgrade patch retrofits projects that already migrated.

For CDK, the flag is only added when both `datadog-lambda-js` and `dd-trace` are present
in the bundle's `nodeModules`, so the runtime import cannot fail.
