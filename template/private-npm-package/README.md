# <%- moduleName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

<!--

## Table of contents

- [Usage](#usage)
- [Design](#design)
- [Development](#development)
- [Support](#support)

## Usage

...

## Design

...

## Development

...

## Support

...

-->

To publish your module to npm and release notes to GitHub:

## Release

While a Buildkite pipeline for CI/CD is generated out of the box, there are some additional steps to get semantic-release working:

<https://github.com/SEEK-Jobs/npm-package-buildkite-pipeline#installing-on-your-repository>

### Releasing latest

Commits to the `master` branch will be released with the `latest` tag, which is the default used when running `npm install` or `yarn install`.

### Releasing other dist-tags

semantic-release prescribes a branch-based workflow for managing [distribution tags].

[distribution tags]: https://docs.npmjs.com/adding-dist-tags-to-packages

You can push to other branches to manage betas, maintenance updates to prior major versions, and more.

Here are some branches that semantic-release supports by default:

| Git branch | npm dist-tag |
| :--------- | :----------- |
| master     | latest       |
| alpha      | alpha        |
| beta       | beta         |
| next       | next         |
| 1.x        | release-1.x  |

For more information, see the semantic-release docs:

<https://github.com/semantic-release/semantic-release/#triggering-a-release>
