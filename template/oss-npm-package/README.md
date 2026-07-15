# <%- moduleName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

This package is intended to be public on [seek-oss].
To create an internal package,
run `skuba init` and select the `private-npm-package` template.

Next steps:

1. [ ] Read [SEEK's Open Source RFC].
2. [ ] Create a new repository in the [seek-oss] GitHub organisation.
3. [ ] Push local commits to the upstream GitHub branch.
4. [ ] Configure [GitHub repository settings].
5. [ ] Keep dependencies up to date with [Renovate];
       request installation in [#open-source].
6. [ ] Delete this checklist 😌.

[#open-source]: https://slack.com/app_redirect?channel=C39P1H2SU
[GitHub repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings
[Renovate]: https://github.com/apps/renovate
[SEEK's Open Source RFC]: https://rfc.skinfra.xyz/RFC016-Open-Source.html

## API

### `log`

Writes the module name to stdout.
Thrilling stuff.

```typescript
import { log } from '<%- moduleName %>';

log();
```

## Development

### Prerequisites

- Node.js 22+
- pnpm

```shell
pnpm install
```

### Test

```shell
pnpm test
```

### Lint

```shell
# Fix issues
pnpm format

# Check for issues
pnpm lint
```

### Package

```shell
# Compile source
pnpm build

# Review bundle
pnpm pack
```

## Release

This package is published to the public npm registry with a GitHub Actions [release workflow].
It depends on this repo being hosted on [seek-oss] with appropriate access;
follow the [OSS npm package guidance] to set up publishing.

Releases are managed with [changesets].
Run `pnpm changeset` to create a changeset file describing your change and its semver impact.
When merged to `<%-defaultBranch%>`, the release workflow will open a version bump PR.
Merging that PR publishes the new version to npm.

### Releasing snapshots

Snapshot releases let you publish a pre-release version from any branch without going through the full release process.
To publish a snapshot, manually trigger the [release workflow] on your branch via the GitHub Actions UI.
The snapshot will be published to npm under a unique version derived from the branch name.

[changesets]: https://github.com/changesets/changesets
[distribution tags]: https://docs.npmjs.com/adding-dist-tags-to-packages
[OSS npm package guidance]: https://github.com/SEEK-Jobs/seek-oss-ci/blob/master/NPM_PACKAGES.md#access-to-publish-to-npm
[release workflow]: .github/workflows/release.yml
[seek-oss]: https://github.com/seek-oss
