---
'skuba': patch
---

lint: Remove `Dockerfile-incunabulum` rule

Previously, `skuba lint` would search for and delete a file named `Dockerfile-incunabulum` to correct a historical issue that had it committed to source control. This rule has been removed as the file has been cleaned up from most SEEK repositories.
