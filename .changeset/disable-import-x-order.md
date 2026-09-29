---
'eslint-config-skuba': major
'skuba': minor
---

lint: Disable `import-x/order`

As part of our transition to Oxfmt and Oxlint, import order is now handled by Oxfmt. Keeping `import-x/order` enabled conflicts with Oxfmt's `sortImports` setting.

To restore the previous behavior, you can add the following rule to your ESLint config:

```javascript
{
  'import-x/order': [
    'error',
    {
      alphabetize: {
        order: 'asc',
      }
      'newlines-between': 'always'
      pathGroups: [
        {
          group: 'external',
          pattern: 'src',
          position: 'after',
        },
        {
          group: 'external',
          pattern: 'src/**',
          position: 'after',
        },
      ]
      pathGroupsExcludedImportTypes: ['builtin'],
    },
  ],
}
```
