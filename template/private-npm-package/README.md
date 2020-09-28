# <%- moduleName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

This package is intended to be private on [SEEK-Jobs] under the `@seek` npm org.
To create a public package,
run `skuba init` and select the `oss-npm-package` template.

## Table of contents

- [API](#api)
- [Development](#development)
- [Release](#release)

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
- Yarn 1.x

```shell
yarn install
```

### Test

```shell
yarn test
```

### Lint

```shell
# fix
yarn format

# check
yarn lint
```

### Package

```shell
# compile source
yarn build

# review bundle
npm pack
```

## Release

This package is published to the npm registry under the private `@seek` npm org with [Gutenberg], SEEK's central npm publishing pipeline.

It depends on this repo being hosted on [SEEK-Jobs] with appropriate access.

To set up this repo for publishing, follow the instructions in Gutenberg's [installing on your repository] guidance.

### Releasing latest

Commits to the `main` branch will be released with the `latest` tag,
which is the default used when running `npm install` or `yarn install`.

### Releasing other dist-tags

**[semantic-release]** prescribes a branch-based workflow for managing [distribution tags].

You can push to other branches to manage betas, maintenance updates to prior major versions, and more.

Here are some branches that **semantic-release** supports by default:

| Git branch | npm dist-tag |
| :--------- | :----------- |
| main       | latest       |
| alpha      | alpha        |
| beta       | beta         |
| next       | next         |
| 1.x        | release-1.x  |

For more information, see the **semantic-release** docs on [triggering a release].

[distribution tags]: https://docs.npmjs.com/adding-dist-tags-to-packages
[gutenberg]: https://github.com/SEEK-Jobs/gutenberg
[installing on your repository]: https://github.com/SEEK-Jobs/gutenberg#installing-on-your-repository
[seek-jobs]: https://github.com/SEEK-Jobs
[semantic-release]: https://github.com/semantic-release/semantic-release
[triggering a release]: https://github.com/semantic-release/semantic-release/#triggering-a-release
