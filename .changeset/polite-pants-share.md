---
'skuba': patch
---

deps: Remove `why-is-node-running`

[`why-is-node-running`](https://www.npmjs.com/package/why-is-node-running) was previously added to the skuba CLI to troubleshoot scenarios where commands were timing out in CI. This has now been removed to avoid disruption to commands such as [`jest --detectOpenHandles`](https://jestjs.io/docs/cli#--detectopenhandles).
