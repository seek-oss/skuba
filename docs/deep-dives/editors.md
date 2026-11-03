---
parent: Deep dives
---

# Editors

---

**skuba** uses regular ESLint and Oxfmt configurations that should be compatible with most editor integrations.

---

## Visual Studio Code

1. Install the following community extensions:
   1. [ESLint (`dbaeumer.vscode-eslint`)](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
   1. [Oxc (`oxc.oxc-vscode`)](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)

1. Configure Oxfmt as the default formatter.

   Since many projects still use Prettier, you may prefer to configure this at the **project level** (`.vscode/settings.json`) rather than globally to avoid affecting other repos.

   Run the following command to apply the project-level settings automatically:

   ```shell
   skuba migrate oxfmt-vscode
   ```

   Alternatively, you can configure it in your default or user settings via ⇧ ⌘ P › Preferences: Open User/Default Settings (JSON), or create/edit `.vscode/settings.json` by hand:

   ```json
   {
     "[typescript]": {
       "editor.codeActionsOnSave": {
         "source.fixAll.eslint": "explicit"
       },
       "editor.defaultFormatter": "oxc.oxc-vscode",
       "editor.formatOnSave": true
     },
     "typescript.tsdk": "./node_modules/typescript/lib"
   }
   ```

## WebStorm

1. Go to Settings > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint and tick `Automatic ESLint configuration` and `Run eslint --fix on save`.
2. Install the [Oxc](https://plugins.jetbrains.com/plugin/27061-oxc) plugin and enable format on save in its Oxfmt settings.
