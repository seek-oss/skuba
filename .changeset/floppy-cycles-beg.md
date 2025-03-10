---
'skuba': patch
---

init: skip malformed template files

`skuba init` runs templates, either bundled or [BYO](https://seek-oss.github.io/skuba/docs/templates/byo.html), through a series of string templating and processing steps.

Occasionally, binary files can include substrings that appear to be directives for skuba to translate the file contents, which may then proceed to crash.

To work around this, `skuba init` now skips templating of a given file when encountering an error.
