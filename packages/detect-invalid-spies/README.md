# @skuba-lib/detect-invalid-spies

Detects `jest.spyOn` / `vi.spyOn` usage patterns where the spy won't work because the spied function is called internally within the same module it is exported from.

## The problem

When you spy on a named export, the spy replaces the binding on the **module namespace object**. But if the source module calls that function directly (using its local binding), those calls bypass the spy entirely.

```ts
// greet.ts
export const sayHello = (name: string) => `Hello, ${name}!`;

export const greetEveryone = (names: string[]) =>
  names.map((name) => sayHello(name));
//                   ^^^^^^^^ calls the local binding — not the export
```

```ts
// greet.test.ts
import * as greet from './greet.js';

it('greets everyone with a custom message', () => {
  vi.spyOn(greet, 'sayHello').mockReturnValue('Hi!');

  // ✗ Fails — greetEveryone bypasses the spy and calls the original sayHello
  expect(greet.greetEveryone(['Alice'])).toEqual(['Hi!']);
});
```

The test silently passes in Jest (which rewrites module bindings) but fails in Vitest (which does not), making this a common source of breakage when migrating between the two.

## Usage

Run it against a directory of source files:

```sh
pnpm dlx @skuba-lib/detect-invalid-spies .
```

It prints each invalid spy to stderr and exits with code `1` if any are found:

```
  Invalid spy in src/greet.test.ts
  spy:     (jest|vi).spyOn(…, 'sayHello')
  module:  src/greet.ts (via './greet.js')
  reason:  'sayHello' is called internally — the spy won't intercept it
```
