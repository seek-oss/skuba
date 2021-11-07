---
parent: Development API
---

# GitHub

---

## createCheckRun

Asynchronously creates a GitHub [check run] with annotations.

The first 50 `annotations` are written in full to GitHub.

A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with the `checks:write` permission must be present on the environment.

```typescript
import { GitHub } from 'skuba';

const main = async () => {
  const annotations = await createAnnotations();

  await GitHub.createCheckRun({
    annotations,
    conclusion: 'failure',
    name: 'skuba/lint',
    summary: '`skuba/lint` found issues that require triage.',
    title: 'Build #123 failed',
  });
};
```

See our [GitHub guide] for more information.

[check run]: https://docs.github.com/en/rest/reference/checks#runs
[github guide]: ../deep-dives/github.md
