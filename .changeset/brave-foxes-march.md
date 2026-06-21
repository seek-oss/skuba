---
'skuba': patch
---

init: Clean up partially-initialised directory when non-interactive templating fails

When `skuba init` reads its config from stdin and the provided `templateData` is missing required fields or templating cannot be skipped, it now deletes the directory it created before exiting. Previously this left a broken project behind that had to be manually removed before retrying.
