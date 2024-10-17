---
'skuba': patch
---

format, lint: Do not modify config files if version is outdated

Starting from this version, `skuba format` will not modify config files if it detects that it is older than the version that last wrote to the project `package.json`:

```json
{
  "skuba": {
    "version": "1.0.0"
  }
}
```

This is intended to address the scenario where you have an older version of skuba installed locally, run `skuba format`, and inadvertently revert config files to a prior state.
