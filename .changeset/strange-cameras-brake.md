---
'skuba': minor
---

lint, format, template: Use pinned `pnpm` version in Dockerfiles

This fixes an issue where `pnpm` commands in Dockerfiles incorrectly use the latest pnpm version instead of the pinned version.
