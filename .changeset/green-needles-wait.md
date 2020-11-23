---
'skuba': minor
---

**lint:** Check for unused `eslint-disable` directives

`skuba lint` will now report on unnecessary `eslint-disable` directives that should be removed:

```diff
- /* eslint-disable-next-line new-cap */
const camelCase = 'no problems here';
```
