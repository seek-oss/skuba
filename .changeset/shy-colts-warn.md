---
"skuba": patch
---

build-package, lint: Handle worker thread errors more gracefully

The worker threads now correctly propagate an exit code and log errors instead of triggering an `UnhandledPromiseRejectionWarning`.
