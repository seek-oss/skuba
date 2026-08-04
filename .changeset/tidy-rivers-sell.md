---
'skuba': patch
---

migrate: Upgrade `datadog-lambda-js` instead of disabling Datadog handler redirection during ESM migration

`datadog-lambda-js@12.140.0` fixes Datadog handler redirection under ESM, so the ESM migration no longer sets `redirectHandler: false` (CDK) / `redirectHandlers: false` (Serverless) or appends `--import dd-trace/initialize.mjs` to the Lambda `NODE_OPTIONS`. Instead it upgrades `datadog-lambda-js` to the ESM-compatible `^12.140.0` release and leaves handler redirection enabled.
