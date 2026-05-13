# @skuba-lib/detect-invalid-spies

Detects `jest.spyOn` / `vi.spyOn` usage patterns where the spy won't work as expected.

## The problems

### Problem 1: Internal usage in the spied module

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

### Problem 2: Direct import in the test file

When you both spy on a function via a namespace import AND directly import the same function in your test file, the direct import creates a binding that bypasses the spy.

```ts
// service.ts
export const fetchUser = (id: string) => ({ id });
```

```ts
// service.test.ts
import * as service from './service.js';
import { fetchUser } from './service.js'; // ← direct import

it('fetches a user', () => {
  vi.spyOn(service, 'fetchUser').mockReturnValue({ id: 'mock' });

  // ✗ Calls the original function, not the spy!
  const user = fetchUser('123');
  expect(user).toEqual({ id: 'mock' });
});
```

This is invalid because the direct import (`fetchUser`) and the spied namespace property (`service.fetchUser`) are separate bindings. The spy only affects the namespace binding.

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
