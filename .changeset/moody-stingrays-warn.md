---
"skuba": patch
---

deps: Include `@octokit/types`

This should fix the following compilation error:

```
node_modules/skuba/lib/api/github/checkRun.d.ts(2,45): error TS2339: Property 'POST /repos/{owner}/{repo}/check-runs' does not exist on type 'Endpoints'.
```
