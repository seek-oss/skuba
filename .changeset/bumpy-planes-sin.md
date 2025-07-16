---
'skuba': patch
---

format, lint: Respect Prettier ignore files in parent directories

Previously, `skuba format` and `skuba lint` only looked for `.gitignore` and `.prettierignore` in the current working directory. Now, you can execute these commands in a subdirectory while centralising ignore files in the root directory.

```text
┌── apps/
│   └── a/
│       ├── src/
│       ├── package.json
│       └── ...
│   └── b/ <- execute skuba lint here
│       ├── src/
│       ├── package.json
│       └── ...
├── .gitignore
├── .prettierignore <- and it will respect this
├── package.json
└── ...
```
