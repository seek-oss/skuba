---
'skuba': minor
---

lint: Replace `.buildkite/` files with duplicated YAML merge keys, for example:

```yaml
# Before
- <<: *deploy
  <<: *docker
  label: stuff

# After
- <<: [*deploy, *docker]
  label: stuff
```

This should have no functional change, and is to support standardised YAML parsing across different tools, including the latest ESLint upgrades.

This migration will not be capture all cases of this (e.g. if there are keys between the merge keys). If you have other cases, update them following the example above.
