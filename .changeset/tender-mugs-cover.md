---
'skuba': major
---

**node**: Upgrade to Node 14

Node 14 is now supported on AWS Lambda:
<https://aws.amazon.com/about-aws/whats-new/2021/02/aws-lambda-now-supports-node-js-14/>

We can now upgrade the Node requirement across Skuba & its templates.
This has two major impacts on consumers:

- Node 14+ is required for running the `skuba` command locally or on CI

- Libraries compiled with Skuba 4 will target ES2020 features that require Node 14+

Please ensure you upgrade your project's Node version before switching to Skuba 4.
You can use this PR as an example of the changes required.
