---
'skuba': patch
---

migrate: Prefer instrumenting dd-trace with dd-trace/register.js instead of dd-trace/initialize.mjs in ESM migration.

This caused some issues with some DataDog consumers where their APM was not properly initializing. If you notice that your DataDog APM is not working after migrating to ESM, please update your Dockerfile to use `--import dd-trace/register.js` instead of `--import dd-trace/initialize.mjs`.
