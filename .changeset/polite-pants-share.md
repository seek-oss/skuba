---
'skuba': patch
---

cli: Require `--debug` flag to collect `why-is-node-running` information

[`why-is-node-running`](https://www.npmjs.com/package/why-is-node-running) was previously added to the skuba CLI to troubleshoot scenarios where commands were timing out in CI. This is now gated behind the `--debug` flag to minimise disruption of commands such as [`jest --detectOpenHandles`](https://jestjs.io/docs/cli#--detectopenhandles).
