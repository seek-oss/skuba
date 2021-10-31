---
parent: Development API
---

# GitHub

---

## createCheckRun

Asynchronously creates a GitHub [Check Run] with annotations.

If the number of `annotations` provided exceeds 50, the number sent to GitHub will be capped to 50 and an explanation will be appended to the `summary`.

If the following environment variables are not present,
the function will silently return without attempting to create a check run:

- `BUILDKITE_REPO`
- `BUILDKITE_COMMIT`
- `BUILDKITE_BUILD_NUMBER`
- `GITHUB_API_TOKEN`

```typescript
import { GitHub } from 'skuba';

const main = async () => {
  const annotations = await createAnnotations();

  await GitHub.createCheckRun({
    name: 'lint',
    summary: 'Eslint found issues that require triage.',
    annotations,
    conclusion: 'failure',
  });
};
```

See our [GitHub guide] for more information.

[github guide]: ../deep-dives/github.md
[check run]: https://docs.github.com/en/rest/reference/checks#runs
