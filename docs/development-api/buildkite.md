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

[buildkite guide]: ../deep-dives/buildkite.md
