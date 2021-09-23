---
parent: CLI
nav_order: 1
---

# Create a new project

---

**skuba** can guide you through an interactive prompt to initialise a new directory and Git repository for your project.
It includes a set of starter [templates] that reflect the typical components of a core SEEK service.

If you are looking to bootstrap an existing project,
see [`skuba configure`].

---

## skuba init

Creates a new project from a starter [template].

This guides you through an interactive prompt:

```shell
skuba init

? For starters, some GitHub details:
⊙  Owner : SEEK-Jobs/my-team
⊙   Repo : my-repo

# ...
```

`skuba init` does not provision any resources in AWS or Buildkite on its own,
and only requires a connection to the public npm registry.
It does start you off with a [Buildkite pipeline] that should be ready to go once you've pushed your repository to GitHub and configured Buildkite.

### Unattended execution

`skuba init` is interactive by default.
For unattended execution, pipe in JSON:

```shell
skuba init << EOF
{
  "destinationDir": "tmp-greeter",
  "templateComplete": true,
  "templateData": {
    "ownerName": "my-org/my-team",
    "prodBuildkiteQueueName": "123456789012:cicd",
    "repoName": "tmp-greeter"
  },
  "templateName": "greeter"
}
EOF
```

[`skuba configure`]: ./configure.md#skuba-configure
[buildkite pipeline]: https://buildkite.com/docs/pipelines/defining-steps
[template]: ../templates
[templates]: ../templates
