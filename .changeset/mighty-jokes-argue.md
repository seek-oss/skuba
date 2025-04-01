---
'skuba': minor
---

lint: Add a **skuba** patch to automatically stop CDK snapshot tests from calling esbuild bundling.

Calling esbuild bundling during unit tests can be slow. This change looks for `new App()` use in `infra` folder test files, and if found, replacing with `new App({ context: { 'aws:cdk:bundling-stacks': [] } })`. This context signals AWS CDK to skip bundling for the test stack.
