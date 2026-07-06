---
'skuba': patch
---

lint: Replace the dd-trace `NODE_OPTIONS` Lambda hack with `datadog-lambda-js` >=12.140.0

The 16.1.0 patch that added `--import dd-trace/initialize.mjs` to the Lambda `NODE_OPTIONS` (and `redirectHandler: false` / `redirectHandlers: false`) has been removed now that `datadog-lambda-js@12.140.0` fixes handler redirection under ESM. Projects upgrading from an older version no longer apply this workaround only to immediately reverse it, avoiding redundant file churn and a duplicate install.

A new upgrade patch reverses the previous workaround on already-migrated projects: it removes `--import dd-trace/initialize.mjs` from the Lambda `NODE_OPTIONS` and the `redirectHandler: false` (CDK) / `redirectHandlers: false` (Serverless) settings, and upgrades `datadog-lambda-js` to the ESM-compatible `^12.140.0` release.
