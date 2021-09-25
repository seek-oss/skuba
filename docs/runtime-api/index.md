---
nav_order: 5
---

# Runtime API

---

<https://github.com/seek-oss/skuba-dive#api-reference>

**skuba-dive** is an optional runtime component for **skuba**.

**skuba-dive** should be a `dependency` that is included in your production bundle.

```json
{
  "dependencies": {
    "skuba-dive": "*"
  },
  "devDependencies": {
    "skuba": "*"
  }
}
```

**skuba-dive** is intentionally limited to boilerplate cross-cutting concerns and runtime augmentations,
as our preference is to foster runtime packages that are specific and standalone rather than bundling a monolithic API.
See our [goals] and [non-goals] to learn more.

[goals]: ../about.md#goals
[non-goals]: ../about.md#non-goals
