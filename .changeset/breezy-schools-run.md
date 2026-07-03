---
'skuba': patch
---

lint: Remove the dd-trace `NODE_OPTIONS` Lambda hack from the 16.1.0 upgrade patch

The 16.1.0 patch that added `--import dd-trace/initialize.mjs` to the Lambda `NODE_OPTIONS` (and `redirectHandler: false` / `redirectHandlers: false`) has been removed now that `datadog-lambda-js@12.140.0` fixes handler redirection under ESM. Projects upgrading from an older version no longer apply this workaround only for the 16.2.0 patch to immediately reverse it, avoiding redundant file churn and a duplicate install.
