---
'skuba': patch
---

GitHub.putIssueComment: Support `userId: 'seek-build-agency'`

The `userId` parameter is an optimisation to skip user lookup. A descriptive constant is now supported on SEEK build agents:

```diff
await GitHub.putIssueComment({
  body,
- userId: 87109344, // https://api.github.com/users/buildagencygitapitoken[bot]
+ userId: 'seek-build-agency',
});
```
