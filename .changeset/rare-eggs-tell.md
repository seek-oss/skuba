---
'skuba': patch
---

template/lambda-sqs-worker-cdk: Update tests to use a stable identifier for the `AWS::Lambda::Version` logical IDs in snapshots. This avoid snapshot changes on unrelated source code changes.
