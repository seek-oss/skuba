---
'@skuba-lib/api': minor
---

api: Adds `Cdk.normaliseTemplate` function that produces stable snapshots of CDK stack templates by stripping volatile, environment-specific values. This is particularly useful for testing, where you want to ensure that your snapshots don't change due to irrelevant differences in generated templates.
