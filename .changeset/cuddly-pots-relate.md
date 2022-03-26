---
'skuba': patch
---

template: Standardise Buildkite pipelines

Our templated pipelines now employ [build matrices](https://buildkite.com/docs/pipelines/build-matrix) and inline YAML anchors to reduce step configuration repetition. Previously, we achieved a similar effect by declaring step configuration snippets under a non-standard, root-level `configs` field.
