---
'@skuba-lib/api': patch
'skuba': patch
---

deps: zod ^4.3.5

This resolves errors such as "ID X already exists in the registry" caused by multiple Zod versions.

If your package declares a dependency on Zod, ensure you use unpinned versioning (e.g. `"zod": "^4.3.5"` instead of `"zod": "4.3.5"`) to avoid installing multiple versions.
