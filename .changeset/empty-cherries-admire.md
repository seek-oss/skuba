---
'skuba': major
---

node, start: Replace `ts-node` with `tsx`

`skuba start` and `skuba node` now use `tsx` instead of `ts-node` for running TypeScript files. `tsx` has better ESM interoperability, like support for dynamic imports (`await import()`), than `ts-node`.

There are some downsides for the REPL (which is what `skuba node` without any file is):

- `import` statements in the REPL are not supported; `require` and `await import()` are still supported.
- Pasting code into the REPL may not work as well as `ts-node`. If encountering issues, a workaround could be to use [`.editor`](https://nodejs.org/en/learn/command-line/how-to-use-the-nodejs-repl#dot-commands)

Otherwise, `skuba start` and `skuba node <file>` _should_ work as expected. However, it is difficult to comprehensively test every scenario, so this has been released as a major version. It is recommended to test your use-cases of `skuba start` and `skuba node` after upgrading.
