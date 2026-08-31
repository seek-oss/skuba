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

1. ⇧ ⌘ P › Preferences: Open Settings (JSON)

1. Add the following settings:

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
