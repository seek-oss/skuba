---
'skuba': patch
---

**template/lambda-sqs-worker:** Default to unversioned Lambdas

Our baseline template does not do canary deployments, and this makes it less likely to hit code storage limits down the road.
