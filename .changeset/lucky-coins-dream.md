---
'skuba': patch
---

**template/koa-rest-api:** Switch to Runtypes

Yup has overly permissive input coercion (see #151) and weaker type guarantees.

We already use Runtypes in the Lambda template; other options could be explored in future.
