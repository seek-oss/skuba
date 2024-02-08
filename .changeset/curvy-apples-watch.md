---
'skuba': patch
---

lint: Remove lint for removal of `Dockerfile-incunabulum` files

This lint step serviced to ensure that the `Dockerfile-incunabulum` files were removed from the repository,
due to a historical issue where skuba accidentally committed these files. There are now very few install bases
which have these files.
