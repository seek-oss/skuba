# Migrating from seek-module-toolkit

Coming soon™️

## Building

`smt build` → `skuba build-package`

### Compatibility notes

`seek-module-toolkit` compiles your code to:

- `/lib/commonjs`: CommonJS module-compatible code
- `/lib/es2015`: ES2015 module-compatible code
- `/lib`: TypeScript types

This presents issues when referencing non-JS assets,
as the compiled code is nested one level deeper than the source code.

`skuba` compiles your code to:

- `/lib-commonjs`: CommonJS module-compatible code
- `/lib-es2015`: ES2015 module-compatible code
- `/lib-types`: TypeScript types

You should remove workarounds such as:

- Copying non-JS assets into `/lib` so that they are in the parent directory of the referencing code.

  You can include these assets directly in your `package.json#/files` array.

- Varying the referenced path of non-JS assets based on whether the code is source or compiled (i.e. using `__filename`).
