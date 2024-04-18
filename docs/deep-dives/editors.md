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
       "editor.codeActionsOnSave": {
         "source.fixAll.eslint": "explicit"
       },
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```

## Webstorm

1. Go to Settings > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint and tick `Automatic ESLint configuration` and `Run eslint --fix on save`.
2. Go to Settings > Langauges & Frameworks > JavaScript > Prettier and tick `On save`.
