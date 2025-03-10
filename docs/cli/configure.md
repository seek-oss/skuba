---
parent: CLI
nav_order: 2
---

# Update an existing project

---

**skuba** allows for existing projects to be adopted into its tooling and reconfigured on demand.

This is an area where we still have a lot of work to do;
reach out if you're having difficulties reconfiguring your project.

---

## skuba configure

Bootstraps an existing project.

This provides a step-by-step prompt for replacing your config with **skuba**'s.

```shell
skuba configure

#     ╭─╮     ╭─╮
# ╭───│ ╰─╭─┬─╮ ╰─╮───╮
# │_ ─┤  <│ ╵ │ • │ • │
# ╰───╰─┴─╰───╯───╯── ╰
#
# 0.0.0 | latest 0.0.0
#
# Detected project root: /my-repo

? Project type: …
❯ application
  package

# ...
```

You should have a clean working tree before running this command,
so it's easy to `git reset` in case you want to restore your original config.
`skuba configure` will warn if it detects uncommitted changes:

```shell
You have dirty/untracked files that may be overwritten.
```
