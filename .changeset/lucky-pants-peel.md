---
'skuba': patch
---

**template/lambda-sqs-worker-cdk:** Always build before deploy

This prevents stale compiled code from being cached and deployed from ECR.
