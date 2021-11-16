---
parent: Development API
---

# GitHub

---

## buildNameFromEnvironment

Returns the name of the build as seen in GitHub status checks.

This is driven off of environment variables and falls back to `Build`.

```typescript
import { GitHub } from 'skuba';

const buildName = GitHub.buildNameFromEnvironment();
```

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

---

## enabledFromEnvironment

Whether GitHub API interactions should be enabled.

This checks environment variables to see if the code is executing in a CI
environment and has access to a GitHub API token.

```typescript
import { GitHub } from 'skuba';

const enabled = GitHub.enabledFromEnvironment();

if (enabled) {
  // Do GitHub API things.
}
```

---

[check run]: https://docs.github.com/en/rest/reference/checks#runs
[github guide]: ../deep-dives/github.md
