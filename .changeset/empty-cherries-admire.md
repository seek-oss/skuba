---
'skuba': major
---

node, start: Replace `ts-node` with `tsx`

`skuba node` and `skuba start` now use `tsx` instead of `ts-node` to execute TypeScript files.

`tsx` improves support for ESM features like dynamic [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)s. However, if you use its REPL by running `skuba node` without any arguments, there are a couple regressions to note:

- Static [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) declarations are no longer supported. Use `require` and `await import()` instead.
- Pasting code into the editor may be more finicky by default. Consider using [`.editor`](https://nodejs.org/en/learn/command-line/how-to-use-the-nodejs-repl#dot-commands) mode.

`skuba node <file>` and `skuba start` _should_ continue to work as expected, but we have marked this as a major upgrade as it is difficult to comprehensively test every scenario. We strongly recommend to manually verify usage of `skuba node` and `skuba start` when you upgrade.
