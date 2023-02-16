---
'skuba': minor
---

format, lint: Bundle `eslint-plugin-yml`

[eslint-plugin-yml](https://github.com/ota-meshi/eslint-plugin-yml) is now supported on `skuba format` and `skuba lint`. While the default configuration should be unobtrusive, you can opt in to stricter rules in your `.eslintrc.js`:

```diff
module.exports = {
  extends: ['skuba'],
+ overrides: [
+   {
+     files: ['my/strict/config.yaml'],
+     rules: {
+       'yml/sort-keys': 'error',
+     },
+   },
+ ],
};
```

YAML files with non-standard syntax may fail ESLint parsing with this change. Gantry resource files should be excluded by default due to their custom templating syntax, and you can list additional exclusions in your `.eslintignore`.
