---
'skuba': minor
---

cdk: The `Cdk` export is now ESM only

The `Cdk` namespace (`Cdk.normaliseTemplate` and the `Cdk.NodejsFunction` construct) is published as ESM only. Import it from an ESM module or via `import()`. `NodejsFunction` now always emits a single ESM `index.mjs` handler.
