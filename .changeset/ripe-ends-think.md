---
'skuba': patch
---

node, start: Replace `--require dotenv/config` with `--env-file-if-exists .env`

This drops a third-party dependency for the [built-in Node.js option](https://nodejs.org/dist/latest-v22.x/docs/api/cli.html#--env-file-if-existsconfig).
