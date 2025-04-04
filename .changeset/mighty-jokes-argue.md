---
'skuba': minor
---

lint: Patch CDK snapshot tests to skip esbuild bundling

Executing esbuild bundling during unit tests can be slow. This patch looks for `new App()` use in `infra` test files, and if found, replaces them with `new App({ context: { 'aws:cdk:bundling-stacks': [] } })`. This context instructs the AWS CDK to skip bundling for the test stack.
