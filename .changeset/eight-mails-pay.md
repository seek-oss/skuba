---
'skuba': patch
---

**template/lambda-sqs-worker:** Add smoke test

This brings back versioned functions along with `serverless-prune-plugin` to control Lambda storage consumption. By default we configure `serverless-plugin-canary-deployments` for an instantaneous switch once the smoke test has passed, but this can be customised as necessary.
