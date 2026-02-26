---
nav_order: 99
parent: Templates
---

# BYO

---

**skuba** can initialise a new project from an externally-hosted template.
This allows you to build and maintain template repositories with your own preferred baseline of boilerplate code and configuration.

---

## github

**skuba** will shallow-clone your template repo from GitHub and apply some of its base configuration on top.
You may need to run [`skuba configure`] after initialisation to fix up inconsistencies.

[`skuba configure`]: ../cli/configure.md#skuba-configure
