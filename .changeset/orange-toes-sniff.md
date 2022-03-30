---
'skuba': patch
---

template: Exclude DOM type definitions by default

TypeScript will now raise compiler errors when DOM globals like `document` and `window` are referenced in new projects. This catches unsafe usage of browser APIs that will throw exceptions in a Node.js context.

If you are developing a new npm package for browser use, you can opt in to DOM type definitions in your `tsconfig.json`:

```diff
{
  "compilerOptions": {
-   "lib": ["ES2020"]
+   "lib": ["DOM", "ES2020"]
  }
}
```

If you have an existing backend project, you can opt out of DOM type definitions in your `tsconfig.json`.

For Node.js 14:

```diff
{
  "compilerOptions": {
+   "lib": ["ES2020"],
    "target": "ES2020"
  }
}
```

For Node.js 16:

```diff
{
  "compilerOptions": {
+   "lib": ["ES2021"],
    "target": "ES2021"
  }
}
```
