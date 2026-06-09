---
'@skuba-lib/api': minor
'skuba': minor
---

api: Add `Cdk.normaliseTemplate`

This function produces stable snapshots of CDK stack templates by stripping volatile, environment-specific values. This is particularly useful when testing to avoid snapshot churn on inconsequential differences in the generated templates.
