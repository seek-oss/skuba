---
parent: Development API
---

# GitHub

---

## commit

Writes a commit to the local Git repository.

```typescript
import { Git } from 'skuba';

await Git.commit({ dir, message: 'Test a commit' });
```

---

## commitAllChanges

Stages and commits all changes in the local Git repository.

```typescript
import { Git } from 'skuba';

await Git.commitAllChanges({ dir, message: 'Test a commit' });
```

---

## getChangedFiles

Returns all the files which have been added, modified or deleted in the local Git repository

```typescript
import { Git } from 'skuba';

const modifiedFiles = await Git.getChangedFiles({
  dir,
});
```

---

## getHeadCommitId

Gets the object ID of the head commit.

This tries to extract the commit ID from common CI environment variables,
and falls back to the local Git repository log.

```typescript
import { Git } from 'skuba';

const headCommitId = await Git.getHeadCommitId({ dir });
```

---

### getOwnerAndRepo

Extracts the owner and repository names from local Git remotes.

Currently, only GitHub repository URLs are supported:

```console
git@github.com:seek-oss/skuba.git
https://github.com/seek-oss/skuba.git
```

```typescript
import { Git } from 'skuba';

const { owner, repo } = await getOwnerAndRepo({ dir });
```

---

## push

Pushes the specified `ref` from the local Git repository to a remote.

Currently, only GitHub app tokens are supported as an auth mechanism.

```typescript
import { Git } from 'skuba';

await Git.push({
  auth: { type: 'gitHubApp' },
  dir,
  ref: 'commit-id',
  remoteRef: 'branch-name',
});
```

---

## reset

Resets the local Git repository branch to a particular commit

```typescript
import { Git } from 'skuba';

await Git.reset({
  dir,
  branch: 'master',
  commitOid: 'abcd1234',
  hard: true,
});
```
