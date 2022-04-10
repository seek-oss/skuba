---
parent: Development API
---

# Git

---

## commit

Writes a commit to the local Git repository.

```typescript
import { Git } from 'skuba';

await Git.commit({ dir, message: 'Test a commit' });
```

---

## commitAllChanges

Stages all changes and writes a commit to the local Git repository.

Skips the commit and returns `undefined` if there are no changes.

```typescript
import { Git } from 'skuba';

await Git.commitAllChanges({ dir, message: 'Test a commit' });
```

---

## createBranch

Tries to create a new Git branch locally which will throw an error if the branch already exists. You may set clean to `true` if you would like to delete the existing branch if it exists and create a new branch.

```typescript
import { Git } from 'skuba';

await Git.createBranch({
  dir,
  name: 'new-branch',
  checkout: true,
  clean: true,
});
```

---

## currentBranch

Tries to return a Git branch name from CI environment variables,
falling back to the local Git repository when the current working `dir` is supplied.

```typescript
import { Git } from 'skuba';

const currentBranch = Git.currentBranch({ dir });
```

---

## getChangedFiles

Returns all the files which have been added, modified or deleted in the working directory of the local Git repository since the last commit.

```typescript
import { Git } from 'skuba';

const changedFiles = await Git.getChangedFiles({ dir });
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

## getHeadCommitMessage

Gets the message of the head commit.

This tries to extract the message from common CI environment variables,
and falls back to the local Git repository log.

```typescript
import { Git } from 'skuba';

const headCommitMessage = await Git.getHeadCommitMessage({ dir });
```

---

## getOwnerAndRepo

Extracts the owner and repository names from CI environment variables,
falling back to local Git remotes.

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

## getTags

Gets the tags from local Git repository

```typescript
import { Git } from 'skuba';

await Git.getTags({
  dir,
});
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

Resets the specified branch in the local Git repository to a particular commit.

```typescript
import { Git } from 'skuba';

await Git.reset({
  dir,
  branch: 'master',
  commitId: 'abcd1234',
  hard: true,
});
```
