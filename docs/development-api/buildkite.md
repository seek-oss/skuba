---
parent: Development API
---

# Buildkite

---

## annotate

Asynchronously uploads a Buildkite annotation.

If the following environment variables are not present,
the function will silently return without attempting to annotate:

- `BUILDKITE`
- `BUILDKITE_AGENT_ACCESS_TOKEN`
- `BUILDKITE_JOB_ID`

The `buildkite-agent` binary must also be on your `PATH`.

```typescript
import { Buildkite } from 'skuba';

const main = async () => {
  const resultMarkdown = await doWork();

  console.log('Received result:', resultMarkdown);

  await Buildkite.annotate(resultMarkdown);
};
```

See our [Buildkite guide] for more information.

---

## getJobUrl

Returns the URL of the current Buildkite job.

This reads `BUILDKITE_BUILD_URL` and, when `BUILDKITE_JOB_ID` is set, anchors the URL to that job. Returns `undefined` when `BUILDKITE_BUILD_URL` is not set.

```typescript
import { Buildkite } from 'skuba';

const jobUrl = Buildkite.getJobUrl();
```

[buildkite guide]: ../deep-dives/buildkite.md
