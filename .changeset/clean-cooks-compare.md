---
'skuba': patch
---

**configure, init:** Tweak ignore file patterns

Directory names like `/lib-es2015` are ignored based on prefix now,
but certain patterns have been restricted to the root to allow for `/src/lib`.
