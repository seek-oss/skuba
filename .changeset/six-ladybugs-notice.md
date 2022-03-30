---
'skuba': patch
---

template/\*-rest-api: Avoid alternative syntax for ENV instructions

Omitting the `=` symbol in ENV instructions [is discouraged and may be disallowed in future](https://docs.docker.com/engine/reference/builder/#env).

```diff
- ENV NODE_ENV production
+ ENV NODE_ENV=production
```
