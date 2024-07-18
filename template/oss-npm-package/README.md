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

- Node.js LTS
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
npm pack
```

## Release

This package is published to the public npm registry with a GitHub Actions [release workflow].

The workflow runs on select branches:

```yaml
on:
  push:
    branches:
      # add others as necessary
      - $default-branch
      - beta
      # - alpha
```

It depends on this repo being hosted on [seek-oss] with appropriate access.

To set up this repo for publishing, follow the instructions in our [OSS npm package guidance].

### Commit messages

This package is published with **[semantic-release]**, which requires a particular commit format to manage semantic versioning.
You can run the interactive `pnpm commit` command in place of `git commit` to generate a compliant commit title and message.
If you use the `Squash and merge` option on pull requests, take extra care to format the squashed commit in the GitHub UI before merging.

### Releasing latest

Commits to the `<%- defaultBranch %>` branch will be released with the `latest` tag,
which is the default used when running `npm install` or `pnpm install`.

### Releasing other dist-tags

**[semantic-release]** prescribes a branch-based workflow for managing [distribution tags].

You can push to other branches to manage betas, maintenance updates to prior major versions, and more.

Here are some branches that **semantic-release** supports by default:

| Git branch           | npm dist-tag |
| :------------------- | :----------- |
| <%- defaultBranch %> | latest       |
| alpha                | alpha        |
| beta                 | beta         |
| next                 | next         |
| 1.x                  | release-1.x  |

For more information, see the **semantic-release** docs on [triggering a release].

[distribution tags]: https://docs.npmjs.com/adding-dist-tags-to-packages
[OSS npm package guidance]: https://github.com/SEEK-Jobs/seek-oss-ci/blob/master/NPM_PACKAGES.md#access-to-publish-to-npm
[release workflow]: .github/workflows/release.yml
[seek-oss]: https://github.com/seek-oss
[semantic-release]: https://github.com/semantic-release/semantic-release
[triggering a release]: https://github.com/semantic-release/semantic-release/#triggering-a-release
