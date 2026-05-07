---
'skuba': minor
---

init: Support local templates

`skuba init` can now initialise a project from a local directory path.

```shell
./skuba-templates/template-a # Relative to working directory
/Users/my-username/code/skuba-templates/template-a # Absolute path
```

This is available for programmatic usage by prepending `local:` to the path in `templateName`.
