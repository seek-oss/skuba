---
"skuba": minor
---

**template/lambda-sqs-worker:** Switch to ARM64 architecture

These are a bit cheaper and a bit faster than the x86 Lambdas:
<https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2-processor-run-your-functions-on-arm-and-get-up-to-34-better-price-performance/>

The underlying Lambda architecture should be invisible to typical TypeScript Lambdas.
