---
"skuba": patch
---

test: Fix `ts-jest` imports

This resolves the following warning:

```console
Replace any occurrences of "ts-jest/utils" with just "ts-jest".
```

If you're using the `mocked` utility from `ts-jest`, switch over to the built-in Jest function:

```diff
import git from 'isomorphic-git';
- import { mocked } from 'ts-jest';

jest.mock('isomorphic-git');

- mocked(git.commit).mockResolvedValue('');
+ jest.mocked(git.commit).mockResolvedValue('');
```
