---
'skuba': minor
---

Migrate CommonJS global variables to ES modules and enable module type in package.json

**Global variable replacements:**

- Replace `__dirname` with `import.meta.dirname`
- Replace `__filename` with `import.meta.filename`
- Remove obsolete variable declarations like `const __dirname =` and `const __filename =`

**Package configuration:**

- Add `"type": "module"` to all package.json files to enable ES module support
