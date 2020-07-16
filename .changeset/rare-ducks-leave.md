---
'skuba': patch
---

**template/koa-rest-api:** Disable yup input coercion

By default, `yup` is ridiculously permissive in coercing inputs to match a schema:

```typescript
const birb = yup.object().shape({
  name: yup.string().notRequired(),
});

birb.validateSync({ name: 123 });
// { name: '123' }

birb.validateSync({ name: [{ areYouKiddingMe: no }] });
// { name: '[object Object]' }
```

This is surprising behaviour so we turn this off via `strict` mode.
