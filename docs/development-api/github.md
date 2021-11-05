---
parent: Development API
---

# GitHub

---

## createCheckRunFromBuildkite

Asynchronously creates a GitHub [check run] with annotations.

This writes the first 50 `annotations` in full to GitHub.

If the following environment variables are not present,
the function will silently return without attempting to create a check run:

- `BUILDKITE_BUILD_NUMBER`
- `BUILDKITE_COMMIT`
- `BUILDKITE_REPO`
- `GITHUB_API_TOKEN`

```typescript
import { GitHub } from 'skuba';

const main = async () => {
  const annotations = await createAnnotations();

  await GitHub.createCheckRunFromBuildkite({
    name: 'lint',
    summary: 'ESLint found issues that require triage.',
    annotations,
    conclusion: 'failure',
  });
};
```

See our [GitHub guide] for more information.

[check run]: https://docs.github.com/en/rest/reference/checks#runs
[github guide]: ../deep-dives/github.md
