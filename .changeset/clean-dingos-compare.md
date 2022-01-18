---
"skuba": patch
---

init: Fix GitHub template cloning

This resolves the following error when cloning a project template from GitHub:

```typescript
UnknownTransportError: Git remote "git@github.com:owner/repo.git" uses an unrecognized transport protocol: "ssh"
```
