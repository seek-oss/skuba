# <%- moduleName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

This package is intended to be private on [SEEK-Jobs] under the `@seek` npm org.
To create a public package,
run `skuba init` and select the `oss-npm-package` template.

Next steps:

1. [ ] Create a new repository in the [SEEK-Jobs] GitHub organisation.
2. [ ] Follow [Gutenberg] instructions for [installing on your repository].
3. [ ] Push local commits to the upstream GitHub branch.
4. [ ] Configure [GitHub repository settings].
5. [ ] Delete this checklist 😌.

[GitHub repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings
[installing on your repository]: https://github.com/SEEK-Jobs/gutenberg#installing-on-your-repository

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

This package is published to the npm registry under the private `@seek` npm org with [Gutenberg], SEEK's central npm publishing pipeline.

It depends on this repo being hosted on [SEEK-Jobs] with appropriate access.

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
[Gutenberg]: https://github.com/SEEK-Jobs/gutenberg
[SEEK-Jobs]: https://github.com/orgs/seek-jobs/sso
[semantic-release]: https://github.com/semantic-release/semantic-release
[triggering a release]: https://github.com/semantic-release/semantic-release/#triggering-a-release
