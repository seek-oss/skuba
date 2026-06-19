---
nav_order: 99
parent: Templates
---

# BYO

---

**skuba** can initialise a new project from an externally-hosted template.
This allows you to build and maintain template repositories with your own preferred baseline of boilerplate code and configuration.

---

## seek

> This option is only available to SEEK employees with SSH access to [SEEK-Jobs/skuba-templates].

Select `seek →` when running `skuba init`.
**skuba** will fetch the list of available templates directly from [SEEK-Jobs/skuba-templates] and present them as a selection menu.
Once you choose a template, it is downloaded via SSH and applied to your new project.

```text
? Select a template: (Use arrow keys)
❯ seek →
```

```text
Fetching available templates from SEEK-Jobs/skuba-templates...

? Select a SEEK private template: (Use arrow keys)
❯ my-template-a
  my-template-b
```

[seek-jobs/skuba-templates]: https://github.com/SEEK-Jobs/skuba-templates

---

## github

Select `github →` when running `skuba init`.
**skuba** will shallow-clone your template repo from GitHub and apply some of its base configuration on top.

```text
? Select a template: (Use arrow keys)
❯ github →
```

```text
? Git path: seek-oss/skuba
```

The git path should be in `org/repo` format.
**skuba** will clone `git@github.com:<org>/<repo>.git`.

---

## local

Select `local →` when running `skuba init` to use a template from your local filesystem.
This is useful for developing and testing new templates before publishing them.

```text
? Select a template: (Use arrow keys)
❯ local →
```

```text
? Path to local template: ./path/to/my-template
```
