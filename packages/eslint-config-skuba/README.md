# eslint-config-skuba

[![GitHub Release](https://github.com/seek-oss/eslint-config-skuba/workflows/Release/badge.svg?branch=master)](https://github.com/seek-oss/eslint-config-skuba/actions?query=workflow%3ARelease)
[![GitHub Validate](https://github.com/seek-oss/eslint-config-skuba/workflows/Validate/badge.svg?branch=master)](https://github.com/seek-oss/eslint-config-skuba/actions?query=workflow%3AValidate)
[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

Shareable ESLint config for **[skuba]**.

[skuba]: https://github.com/seek-oss/skuba

## Table of contents

- [Usage](#usage)
- [Release](#release)
- [Contributing](https://github.com/seek-oss/eslint-config-skuba/blob/master/CONTRIBUTING.md)

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

It depends on this repo being hosted on [seek-oss] with access to the `SEEK_OSS_CI_NPM_TOKEN` GitHub secret.

### Releasing latest

Commits to the `master` branch will be released with the `latest` tag,
which is the default used when running `pnpm install`.

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
[release workflow]: .github/workflows/release.yml
[seek-oss]: https://github.com/seek-oss
[seek's open source rfc]: https://rfc.skinfra.xyz/RFC016-Open-Source.html
[semantic-release]: https://github.com/semantic-release/semantic-release
[triggering a release]: https://github.com/semantic-release/semantic-release/#triggering-a-release
