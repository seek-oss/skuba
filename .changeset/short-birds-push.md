---
'skuba': patch
---

lint: Replace the dd-trace `NODE_OPTIONS` Lambda hack with `datadog-lambda-js` >=12.140.0

A new upgrade patch reverses the previous workaround on already-migrated projects: it removes `--import dd-trace/initialize.mjs` from the Lambda `NODE_OPTIONS` and the `redirectHandler: false` (CDK) / `redirectHandlers: false` (Serverless) settings, and upgrades `datadog-lambda-js` to the ESM-compatible `^12.140.0` release.
