---
'skuba': minor
---

**api**: Export `apiTokenFromEnvironment` from `GitHub` namespace

The `apiTokenFromEnvironment` function is now available as `GitHub.apiTokenFromEnvironment()`.

If you were importing this function directly from an internal path, update your imports:

```diff
-import { apiTokenFromEnvironment } from 'skuba/lib/api/github/environment';
+import { GitHub } from 'skuba';

-const apiToken = apiTokenFromEnvironment();
+const apiToken = GitHub.apiTokenFromEnvironment();
```
