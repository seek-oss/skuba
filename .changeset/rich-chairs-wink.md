---
'skuba': minor
---

format, lint: Fix duplicated YAML merge keys in `.buildkite/` pipelines

```diff
- - <<: *deploy
-   <<: *docker
+ - <<: [*deploy, *docker]
    label: stuff
```

This change supports standardised YAML parsing across tools such as ESLint; it should not functionally alter the behaviour of your build pipeline.

The bundled patch is fairly conservative and will not attempt to migrate more complex scenarios, such as where there are other keys between the merge keys. Review whether the order of keys matters before manually updating other occurrences.

```diff
- - <<: *deploy
+ - <<: [*deploy, *docker]
    label: stuff
-   <<: *docker
```
