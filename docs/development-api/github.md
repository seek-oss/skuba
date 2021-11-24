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

## getPullRequestNumber

Gets the number of the current pull request.

This tries to extract the pull request from common CI environment variables,
and falls back to querying the GitHub Repos API for the latest pull request associated with the head commit.
An error is thrown if there are no associated pull requests, or if they are all closed or locked.

```typescript
import { GitHub } from 'skuba';

const pullRequestNumber = await GitHub.getPullRequestNumber();
```

---

## putIssueComment

Asynchronously creates or updates a GitHub issue comment.

This emulates `put` behaviour by overwriting the first existing comment by the same author on the issue,
enabling use cases like a persistent bot comment at the top of the pull request that reflects the current status of a CI check.

A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with write permissions must be present on the environment.

```typescript
import { GitHub } from 'skuba';

await GitHub.putIssueComment({ body: '😌 This change looks fine!' });
```

You can specify an internal identifier to scope the `put` to a particular comment,
preventing it from clobbering other comments from the same bot or user.
The identifier is embedded as hidden content in the comment body.

```typescript
import { GitHub } from 'skuba';

await GitHub.putIssueComment({
  body: 'Lint passed!',
  internalId: 'lint-a8d9178b-822c-49ac-b456-93653662f685',
});

// This posts a distinct comment from the prior call.
await GitHub.putIssueComment({
  body: 'Test passed!',
  internalId: 'test-bdc9db38-cc4a-45c3-a7bb-8ebbb3c746a4',
});
```

---

[check run]: https://docs.github.com/en/rest/reference/checks#runs
[github guide]: ../deep-dives/github.md
