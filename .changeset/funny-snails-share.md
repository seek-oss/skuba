---
"skuba": minor
---

node, start: Register `tsconfig-paths`

You can now define module aliases other than `src` for local development and scripting. Specify these through the `paths` compiler option in your `tsconfig.json`:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src": ["src"]
    }
  }
}
```
