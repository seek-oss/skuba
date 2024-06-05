---
"skuba": patch
---

**template:** Remove deprecated `docker-compose.yml` version

Docker has ignored this for a while, and now generates a warning on every build:
https://github.com/compose-spec/compose-spec/blob/master/04-version-and-name.md
