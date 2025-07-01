---
'skuba': minor
---

deps: Jest 30

This major release includes breaking changes. See the [Jest 30](https://jestjs.io/blog/2025/06/04/jest-30) announcement for more information.

Notable changes that may affect your tests:

- **Updated expect aliases**: Expect aliases have been removed which may affect your test assertions. Please run `skuba format` to update your test files automatically.
- **Updated snapshot printing**: Jest have updated the way snapshots are printed, which may require you to update your snapshot tests. Some snapshots may remain poorly indented, and be updated over time when regenerated. You may opt to remove all snapshots (e.g. replace `toMatchInlineSnapshot(...)` with `toMatchInlineSnapshot()` and re-run the tests with `-u`).

In this release, we have enabled the [global cleanup](https://jestjs.io/blog/2025/06/04/jest-30#globals-cleanup-between-test-files) feature by default. This automatically cleans up global state between test files, helping to prevent memory leaks and ensure test isolation.

If you need to revert to the previous behavior, you can configure the `globalsCleanup` option in your `jest.config.ts` file:

```ts
export default Jest.mergePreset({
  testEnvironmentOptions: {
    globalsCleanup: 'soft', // Jest default or `'off'` to disable completely
  },
});
```
