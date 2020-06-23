# <%- moduleName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

This package is intended to be public on [seek-oss].
To create an internal package,
run `skuba init` and select the `private-npm-package` template.

Please read [SEEK's Open Source RFC] before proceeding.

## Table of contents

- [API](#api)
- [Development](#development)
- [Release](#release)

## API

### `log`

Writes "<%- moduleName %>" to stdout.
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

This package is published to the public npm registry with a GitHub Actions [release workflow].

The workflow runs on select branches:

```yaml
on:
  push:
    branches:
      # add others as necessary
      - beta
      - master
      # - alpha
```

It depends on this repo being hosted on [seek-oss] with appropriate access.

To set up this repo for publishing, follow the instructions in our [OSS npm package guidance].

### Releasing latest

Commits to the `master` branch will be released with the `latest` tag,
which is the default used when running `npm install` or `yarn install`.

### Releasing other dist-tags

**[semantic-release]** prescribes a branch-based workflow for managing [distribution tags].

You can push to other branches to manage betas, maintenance updates to prior major versions, and more.

Here are some branches that **semantic-release** supports by default:

| Git branch | npm dist-tag |
| :--------- | :----------- |
| master     | latest       |
| alpha      | alpha        |
| beta       | beta         |
| next       | next         |
| 1.x        | release-1.x  |

For more information, see the **semantic-release** docs on [triggering a release].

[distribution tags]: https://docs.npmjs.com/adding-dist-tags-to-packages
[oss npm package guidance]: https://github.com/SEEK-Jobs/seek-oss-ci/blob/master/NPM_PACKAGES.md#access-to-publish-to-npm
[release workflow]: .github/workflows/release.yml
[seek-oss]: https://github.com/seek-oss
[seek's open source rfc]: https://rfc.skinfra.xyz/RFC016-Open-Source.html
[semantic-release]: https://github.com/semantic-release/semantic-release
[triggering a release]: https://github.com/semantic-release/semantic-release/#triggering-a-release
