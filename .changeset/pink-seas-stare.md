---
'skuba': minor
---

format, lint, template: Mount Buildkite `.npmrc` in `/tmp/` rather than `<workdir>/tmp/`

This avoids accidental inclusion in Git commits or published artifacts, as per the original intent of this handling.

```diff
- secrets: id=npm,src=tmp/.npmrc
+ secrets: id=npm,src=/tmp/.npmrc

- output-path: tmp/
+ output-path: /tmp/
```
