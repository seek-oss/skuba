---
'skuba': minor
---

deps: Jest 29

This major release includes breaking changes. See the [announcement post](https://jestjs.io/blog/2022/08/25/jest-29) for more information.

The `collectCoverageOnlyFrom` configuration option has been removed, and the default snapshot format has been simplified:


```diff
- Expected: \\"a\\"
+ Expected: "a"

- Object {
-   Array []
- }
+ {
+   []
+ }
```
