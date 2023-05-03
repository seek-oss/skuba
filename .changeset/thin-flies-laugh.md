---
'skuba': patch
---

template/\*-rest-api: Remove Gantry `ignoreAlarms` override

This issue has been resolved in Gantry v2.2.0; see its [release notes](https://github.com/SEEK-Jobs/gantry/releases/tag/v2.2.0) for more information.

```diff
deployment:
- # SEEK-Jobs/gantry#488
- ignoreAlarms: true
```
