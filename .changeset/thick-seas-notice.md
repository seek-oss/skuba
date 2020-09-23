---
'skuba': patch
---

**template/koa-rest-api:** Remove `koa-cluster`

While Fargate environments with <= 1 vCPU appear to expose multiple threads,
clustering does not improve performance and only serves to increase idle memory usage.

You may add `koa-cluster` yourself if you have a CPU-bound workload running on multiple vCPUs.
Even in such cases, it may be better to run multiple tasks with one vCPU each rather than one task with multiple vCPUs.
