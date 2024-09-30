---
'skuba': minor
---

template, format: Mount `.npmrc` files in `/tmp/` rather than `<workdir>/tmp/`, to avoid accidental inclusion in commits or published artifacts, as per the original intent of this handling.
