---
nav_order: 99
---

# Contributing

Hi there, thanks for checking out our repo!

**skuba** is a toolkit for developing TypeScript backend applications and packages at SEEK.
While third-party contributions are certainly welcome,
this project is primarily driven by our internal priorities and technology strategy.

SEEKers: this repo is public,
so don't commit or post anything that isn't ready for the entire world to see.

## Table of contents

- [Getting started](#getting-started)
  - [I want to discuss or report something](#i-want-to-discuss-or-report-something)
  - [I want to contribute a change](#i-want-to-contribute-a-change)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Git workflow](#git-workflow)
  - [Testing](#testing)
  - [Running locally](#running-locally)
- [Releases](#releases)
  - [Creating a changeset](#creating-a-changeset)
  - [Publishing a release](#publishing-a-release)
  - [Publishing a prerelease](#publishing-a-prerelease)

## Getting started

**skuba** is documented through its [README](README.md),
along with some targeted topics under the [docs](docs) directory.
We maintain a [changelog] and [release notes] on GitHub,
and distribute it as an [npm package].

### I want to discuss or report something

[Submit an issue] if you have a question, feature request or bug report.

If you work at SEEK, [#typescriptification] is your friend.

### I want to contribute a change

Feel free to [create a pull request] for trivial fixes and improvements.

For more substantial features, please [submit an issue] first.
This lets us evaluate whether the feature fits the direction of the project and discuss possible approaches.

## Development

### Prerequisites

**skuba** is predominantly tested on macOS and Linux.
If you're on Windows, we recommend the [Windows Subsystem for Linux].

First, some JavaScript tooling:

- Node.js 14+
- Yarn 1.x

Next, install npm dependencies:

```shell
yarn install
```

### Git workflow

We use [GitHub flow](https://guides.github.com/introduction/flow/).

Create a new branch off of the latest commit on master:

```shell
git fetch origin
git switch --create your-branch-name origin/master
```

Develop, [test](#testing) and commit your changes on this branch.
(Make sure to include the appropriate [changeset](#creating-a-changeset).)

```shell
git add --all
git commit
```

Finally, push your branch to GitHub and [create a pull request]:

```shell
git push --set-upstream origin your-branch-name
```

If you don't have push access,
you may need to [fork the repo] and push there instead:

```shell
git remote add fork git@github.com:your-username/skuba.git
git push --set-upstream fork your-branch-name
```

A maintainer will get to your pull request and review the changes.
If all is well, they will merge your pull request into master.

### Testing

You may find it easier to develop alongside unit tests:

```shell
yarn test --watch
```

Format your code once you're happy with it:

```shell
yarn format
```

We run linting and testing in CI,
but consider running these commands locally for a faster feedback loop:

```shell
yarn lint
yarn test
```

Our [validate](https://github.com/seek-oss/skuba/blob/master/.github/workflows/validate.yml) GitHub Actions workflow also initialises each built-in **skuba** template and runs through a set of CLI commands.
This can be reproduced locally,
but keep in mind that the script is fairly slow and you'll have to manually clean up afterwards.

```shell
# greeter | koa-rest-api | ...
yarn test:template greeter

# clean up temporary sibling directory
rm -fr ../tmp-greeter
```

### Running locally

If you want to try out the **skuba** CLI on itself,
a `yarn skuba` script is configured:

```shell
# prints available commands
yarn skuba

# prints version from local package.json
yarn skuba version

# builds skuba using itself
yarn skuba build
```

If you want to try out the **skuba** CLI on another local repo,
you can use [npm link] to register your local copy as a global shell command:

```shell
# do this once upfront
npm link

# npm link points to the compiled JavaScript in ./lib/index.js, so
# you'll need to rebuild skuba on every code change
yarn build

# run a skuba command against another repo
cd ../some-other-repo
skuba version

# avoid command confusion after you're done
npm unlink
```

## Releases

### Creating a changeset

We use [Changesets] to manage package releases.
You'll see a 🦋 bot gliding around pull requests.

You should write a changeset if you are changing the public **skuba** interface,
which includes:

- [API](https://github.com/seek-oss/skuba/tree/master/src/api) for Node.js build and test code
- [CLI](https://github.com/seek-oss/skuba/tree/master/src/cli) commands
- [Config](https://github.com/seek-oss/skuba/tree/master/config) presets
- [Template](https://github.com/seek-oss/skuba/tree/master/template) code and documentation
- [npm dependencies](https://github.com/seek-oss/skuba/blob/master/package.json)

On the other hand,
a changeset is not necessary for:

- Documentation like the [README](README.md)
- Internal refactoring that preserves the existing interface
- [npm dev dependencies](https://github.com/seek-oss/skuba/blob/master/package.json)

```shell
yarn changeset
```

The Changesets CLI is interactive and follows [semantic versioning]:

- Patch release `0.0.X`: fixes or tweaks to existing functionality
- Minor release `0.X.0`: new, backwards-compatible functionality
- Major release `X.0.0`: backwards-incompatible modification

Prefix your changeset title with a `**scope:**`.
This makes it easy to eyeball which part of **skuba** a change relates to.

```text
**test:** Fix command

**template:** Add next steps to READMEs

**template/koa-rest-api:** Switch to Express

**format, lint:** Introduce new ESLint rule
```

The Changesets CLI will generate a Markdown file under [.changeset](https://github.com/seek-oss/skuba/tree/master/.changeset),
which you should include in your pull request.
It doesn't need to be part of the same commit as the rest of your changes.
Feel free to manually edit this file to include more details about your change.

### Publishing a release

When a pull request with a changeset is merged,
our CI workflow will create a new `Version Packages` PR.
The changesets are used to infer the next semantic version and to update the [changelog].

This PR may be left open to collate multiple changes into the next version.
A maintainer will merge it once ready,
and our [release](https://github.com/seek-oss/skuba/blob/master/.github/workflows/release.yml) GitHub Actions workflow will publish the associated GitHub release and npm package version.

### Publishing a prerelease

We currently have limited support for prereleases on the `beta` [dist-tag].
This can only be performed by a maintainer.

```shell
# revert beta branch to match master
git fetch origin
git switch beta
git reset --hard origin/master

# stage a beta release
yarn changeset pre enter beta
yarn changeset version
```

If previous betas have been released under the same semantic version,
you will need to manually bump the version suffix in [package.json](https://github.com/seek-oss/skuba/blob/master/package.json):

```diff
- "version": "4.0.0-beta.1",
+ "version": "4.0.0-beta.2",
```

Then, commit and push your changes:

```shell
git add --all
git commit --message 'Publish v4.0.0-beta.2'
git push --set-upstream origin beta
```

[#typescriptification]: https://slack.com/app_redirect?channel=CDCPCEPV3
[changelog]: CHANGELOG.md
[changesets]: https://github.com/atlassian/changesets
[create a pull request]: https://github.com/seek-oss/skuba/compare
[dist-tag]: https://docs.npmjs.com/cli/dist-tag
[fork the repo]: https://github.com/seek-oss/skuba/fork
[npm link]: https://docs.npmjs.com/cli/link
[npm package]: https://www.npmjs.com/package/skuba
[release notes]: https://github.com/seek-oss/skuba/releases
[semantic versioning]: https://semver.org/
[submit an issue]: https://github.com/seek-oss/skuba/issues/new/choose
[windows subsystem for linux]: https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux
