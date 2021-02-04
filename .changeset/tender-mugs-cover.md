---
'skuba': minor
---

**all**: Upgrade to Node 14

Node.js 14 is [now supported on AWS Lambda](https://aws.amazon.com/about-aws/whats-new/2021/02/aws-lambda-now-supports-node-js-14/). This lets us upgrade the Node.js requirement for skuba's templates.

This should only impact newly created projects. You can use the template changes in this PR as an example of how to upgrade an existing project.
