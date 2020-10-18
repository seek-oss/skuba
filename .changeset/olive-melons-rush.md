---
'skuba': minor
---

**start:** Support default exports

`skuba start` now works with a Koa application exported with `export default`. This syntax is preferred over `export =` for compatibility with tooling such as Babel.
