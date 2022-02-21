---
"skuba": patch
---

node: Throw unhandled rejections under Node.js 14

When a rejected promise is left unhandled in Node.js 14, it simply logs a warning. This caused `skuba node` to effectively swallow such failures and report a process exit code of 0. We now override this behaviour with [`--unhandled-rejections=throw`](https://nodejs.org/docs/latest-v16.x/api/cli.html#--unhandled-rejectionsmode) to predictably fail with a non-zero exit code across supported Node.js versions.
