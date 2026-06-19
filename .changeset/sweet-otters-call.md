---
'skuba': minor
---

init: Make non-interactive mode discoverable

`skuba init` now accepts a `--non-interactive` flag that forces it to read JSON config from stdin, regardless of whether stdin is a TTY.
Running it without piping any input prints the expected JSON Schema, including a description and example for each field, so the required config is discoverable without trial and error.
A `skuba init --help` (`-h`) option has also been added to document this usage.
