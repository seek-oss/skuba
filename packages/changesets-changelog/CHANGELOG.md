# @skuba-lib/changesets-changelog

## 2.0.0

### Major Changes

- Rebase on `@changesets/changelog-github` / `@changesets/get-github-info` 1.0 ([#2563](https://github.com/seek-oss/skuba/pull/2563) [`6026058`](https://github.com/seek-oss/skuba/commit/6026058265c7a6b16098321f147a71f0faa21101))

  This package is now based on the same generator as [`@changesets/changelog-github`](https://github.com/changesets/changesets/tree/main/packages/changelog-github), with skuba-specific defaults.

  ### vs `@changesets/changelog-github`

  |                        | `@changesets/changelog-github`       | `@skuba-lib/changesets-changelog` |
  | ---------------------- | ------------------------------------ | --------------------------------- |
  | Line order             | Links and thanks first               | Summary first                     |
  | `disableThanks`        | `false` (includes `Thanks [@user]!`) | `true` (omits thanks)             |
  | `Updated dependencies` | Always includes commit links         | Omits commit links by default     |
  | Scopes                 | Plain text                           | Bolded (`**api:** …`)             |
  | `template`             | Experimental token string            | Not supported                     |

  Default `@changesets/changelog-github` line:

  ```md
  - [#123](...) [`abc1234`](...) Thanks [@ghost](...)! - fix the thing
  ```

  Default `@skuba-lib/changesets-changelog` line:

  ```md
  - fix the thing ([#123](...) [`abc1234`](...))
  ```

  ### vs `@skuba-lib/changesets-changelog` 1.0

  For existing consumers, `changeset version` output changes in a few places:

  1. **Each entry now includes the commit as well as the PR.** Previously only the PR was linked:

     ```md
     - fix the thing ([#123](...))
     ```

     now:

     ```md
     - fix the thing ([#123](...) [`abc1234`](...))
     ```

  2. **Internal dependency bumps are listed.** 1.0 omitted the `Updated dependencies` section entirely. It now looks like:

     ```md
     - Updated dependencies:
       - package@version
     ```

     Set `"disableDependencyLinks": false` to restore commit links on that heading, matching `@changesets/changelog-github`.

  3. **`GITHUB_TOKEN` is now required.** 1.0 warned and degraded to Git-based versioning, writing a bare commit SHA:

     ```md
     - fix the thing (a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0)
     ```

     `changeset version` now fails without a token, matching `@changesets/changelog-github`. Export `GITHUB_TOKEN` (or add it to `.env`) when versioning locally.

  4. **Bare issue references are linked.** `[#1234](https://github.com/seek-oss/skuba/issues/1234)` in a changeset summary becomes a link to that issue or PR.

  5. **Missing commits or pull requests no longer throw.** Versioning continues without that GitHub metadata.

  6. **`"disableThanks": false`** opts back into author attribution (`Thanks [@user]!`).

### Patch Changes

- Allow Node.js 22.14+ ([#2552](https://github.com/seek-oss/skuba/pull/2552) [`fcc5e23`](https://github.com/seek-oss/skuba/commit/fcc5e23e447624e589688effc568c1e17ae80840))

## 1.0.1

### Patch Changes

- Fix exports ([#2379](https://github.com/seek-oss/skuba/pull/2379))

## 1.0.0

### Major Changes

- Publish first version ([#2334](https://github.com/seek-oss/skuba/pull/2334))
