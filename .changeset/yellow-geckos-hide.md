---
'skuba': patch
---

migrate: Add `skuba migrate oxfmt-vscode` command

Adds a new migration that configures `.vscode/settings.json` to use the [Oxc VS Code extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) as the default formatter for JavaScript and TypeScript files, with `editor.formatOnSave` enabled.

Configuring this at the project level is useful when working across multiple repos, since many projects still use Prettier and a global formatter setting would affect those repos too.
