---
'skuba': patch
---

migrate, lint: Add `--import dd-trace/initialize.mjs` to Lambda `NODE_OPTIONS` when handler redirection is disabled

When Datadog handler redirection is turned off (`redirectHandler: false` for CDK, `redirectHandlers: false` for Serverless), Datadog no longer auto-wraps the handler so `dd-trace` must be preloaded explicitly via the [--import](https://nodejs.org/api/cli.html#importmodule) flag. The ESM migration now appends `--import dd-trace/initialize.mjs` to the Lambda function's [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#node_optionsoptions) in this case, and a new upgrade patch retrofits projects that already migrated.
