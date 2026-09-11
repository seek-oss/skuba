---
'eslint-config-skuba': major
'skuba': minor
---

lint: Disable `import-x/order`

As part of our transition to Oxfmt and Oxlint, import order is now handled by Oxfmt. Keeping `import-x/order` enabled conflicts with Oxfmt's `sortImports` setting.

`skuba format` rewrites `eslint-disable` comments for `import-x/order` (and legacy `import/order`) to `oxfmt-ignore`, so intentional import order is preserved. Oxfmt only honours a comment whose body is exactly `oxfmt-ignore`, so any `-- reason` is moved to a separate comment above it:

```diff
- // eslint-disable-next-line import-x/order -- Mock import must be at top for jest.mock() hoisting
+ // Mock import must be at top for jest.mock() hoisting
+ // oxfmt-ignore
  import { mocked } from './mocked.js';
```

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
