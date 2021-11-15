---
parent: Deep dives
---

# Editors

---

**skuba** uses regular ESLint and Prettier configurations that should be compatible with most editor integrations.

---

## Visual Studio Code

1. Install the following community extensions:

   1. [ESLint (`dbaeumer.vscode-eslint`)](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
   1. [Prettier (`esbenp.prettier-vscode`)](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

1. ⇧ ⌘ P › Preferences: Open Settings (JSON)

1. Add the following settings:

   ```json
   {
     "[typescript]": {
       "editor.codeActionsOnSave": ["source.fixAll.eslint"],
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```
