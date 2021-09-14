---
'skuba': minor
---

**build:** Remove experimental Babel support

There's limited upside to switching to [Babel-based builds](https://github.com/seek-oss/skuba/tree/master/docs/babel.md) for backend use cases, and it would be difficult to guarantee backwards compatibility with existing `tsconfig.json`-based configuration. Dropping Babel dependencies reduces our package size and resolves [SNYK-JS-SETVALUE-1540541](https://app.snyk.io/vuln/SNYK-JS-SETVALUE-1540541).
