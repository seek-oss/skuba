---
"skuba": patch
---

template/lambda-sqs-worker: Remove qualifier from smoke test invocation

Previously, this template's smoke test hook specified a `$LATEST` qualifier in its `Lambda.Invoke` API call. AWS authorised the call based on the unqualified Lambda ARN in our `serverless.yml` IAM policy, but will stop doing so after April 2022.

To avoid deployment failures, remove the qualifier in `src/hooks.ts`. An unqualified call is equivalent to targeting `$LATEST`.

```diff
- Qualifier: '$LATEST',
+ Qualifier: undefined,
```
