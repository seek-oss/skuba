---
'skuba': patch
---

**node:** Support Node.js inspector options when running a script

Passing an [inspector option](https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options) for script debugging now works as expected:

```bash
yarn skuba node --inspect-brk src/script.ts
```
