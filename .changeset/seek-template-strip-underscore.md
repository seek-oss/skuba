---
'skuba': patch
---

init: Strip underscore prefixes when scaffolding `seek:` private templates

`skuba init` now removes leading underscores from files like `_package.json` and `_.gitignore` when cloning a private template from `SEEK-Jobs/skuba-templates`, matching the behaviour of the built-in and `local:` template paths.

Previously these files were copied verbatim, so a scaffolded project would be left with an `_package.json` and no `package.json`, breaking tooling with errors such as `Could not find a package.json in your working directory`.
