---
"skuba": patch
---

lint: Use worker threads when running `--serial`ly

This aims to reduce the memory footprint of `skuba lint --serial`. ESLint and Prettier are now run in worker threads so their memory can be more readily freed on thread exit.
