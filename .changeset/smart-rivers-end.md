---
'skuba': minor
---

node, start: Forward custom conditions to `tsx`

The `skuba node` and `skuba start` commands now automatically pass custom conditions from `tsconfig.json` ([`customConditions`](https://www.typescriptlang.org/tsconfig/customConditions.html)) and command-line arguments ([`--conditions`](https://nodejs.org/api/cli.html#-c-condition---conditionscondition)) to the `tsx` runtime.
