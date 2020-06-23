# Contributing

> This is a work in progress!

---

- TL;DR I have a question
- What to know first
- How to contribute
- Style guide

## Release process

New versions are published automatically from [TeamCity](https://builds.skinfra.xyz/project.html?projectId=Candidate_BackEnd_Modules_Koala) using [semantic-release](https://github.com/semantic-release/semantic-release).
In order to automatically increment version numbers correctly, commit messages must follow our [semantic commit message convention](https://github.com/seek-oss/commitlint-config-seek).
If your commit includes a breaking change, be sure to prefix your commit body with `BREAKING CHANGE:`.
To make this process easier, we have a commit script (powered by [seek-module-toolkit](https://github.com/SEEK-Jobs/seek-module-toolkit)) to help guide you through the commit process:

```bash
> yarn run commit
```

Once you've committed your work, push your changes to a branch of the same name on GitHub and create a new PR.

Once your work is approved and ready to go, follow these steps:

1. Hit the merge button
2. Ensure the commit message matches the title of the PR (it may have been edited!)
3. Hit the green "confirm" button, and your work should be automatically released! 🚀📦

---

Hi there, thanks for checking out our repository!

⚠️ 🌏 👀 First and foremost, remember that this repo is **open source**.

Don’t post anything or commit any code that isn’t ready for the entire world to see.
Avoid making specific reference to internal processes or features under development.
While a lot of this information is probably harmless, it’s better to be safe than sorry.

If you work at SEEK and have questions or and run into issues, reach out to us in `#typescriptification`.

While third-party contributions are certainly welcome,
note that this project is primarily driven by the requirements of SEEK.

## Table of contents

- Getting started
  - Helpful links
  - I want to discuss or report something
  - I want to contribute a change
- Development
  - Prerequisites
  - Workflow
- Releasing
  - Changesets
  - Prereleases

## Getting started

### Helpful links

- Most of the content is currently in the README.
  Hopefully we'll split it out at some point.

- Changes can be viewed under GitHub releases

### I want to discuss or report something

Asking for help:

- Internal on Slack
- External on GitHub issues

Bug tracker: GitHub issues

If you have a feature request or bug report, please [submit an issue].

### I want to contribute a change

If it’s a trivial fix, feel free to [submit an issue].

[submit an issue]: https://github.com/seek-oss/wingman/issues/new/choose
[create a pull request]: https://github.com/seek-oss/wingman/compare

For large features, it’s recommended that you open an issue so that we can discuss the approach and whether it fits the direction of the project.

## Development

### Prerequisites

We depend on upstream tooling like [sku] that are predominantly tested on macOS and Linux.
If you’re on Windows, we recommend the [Windows Subsystem for Linux].

First, some general tooling:

- Git LFS
- Node.js 12+
- Yarn 1.x

Next, installs:

```shell
git lfs install
yarn install
```

### skuba in skuba

We've wired up a `package.json` script so you can run all the `skuba` commands on the `skuba` repo itself:

```shell
yarn skuba version
```

`skuba` is self-hosted if a toolkit wrapper can call itself that;
it runs its own formatting, linting and testing.

### Testing changes against local projects

`skuba` can be set up to run on local projects.
This works best if the project has already been `skuba init`ed or `skuba configure`d from a stable version.

In this repo, run:

```shell
# one-off
npm link

# whenever you're making changes
yarn build --watch
```

You can now use the symlinked version of `skuba` anywhere.
In another `skuba`-powered repo:

```shell
# uses your local symlink
skuba build

# uses the installed version
yarn build
```

### Running integration-style tests

`skuba` has the following test:

```shell
yarn test:template greeter
```

This performs a full unattended init-build-lint-format-test look for the given template.
The repo is also symlinked to your local version of skuba,
so you can `cd` in there and test out any local changes you've been making:

```shell
cd ../tmp-greeter
yarn build
```

Note that the output is written to a sibling directory `tmp-greeter`,
so if you want to rerun this command, you'll want to clear that out first:

```shell
rm -r ../tmp-greeter
```

### Workflow

We use GitHub flow.
This means that you should create a new branch off of the latest commit on master.

```shell
git checkout master
git pull
git switch --create my-new-branch-name
```

Make your changes.
You may find it easier to develop alongside tests:

```shell
yarn test --watch
```

Once you’re happy with your changes, run formatting:

```shell
yarn format
```

We run linting and testing in CI, but consider running these locally for a faster feedback loop:

```shell
yarn lint
yarn test
```

### Releasing

### Changesets

We use Changesets to manage package releases.
You’ll see a bot on pull requests that you open.

Do you need to create a changeset?

- I’m editing repo internals -> No
- I’m editing the example code -> No
- I’m editing package code -> Yes

On the command line, run:

```shell
yarn changeset
```

You’ll receive prompts.
We follow semantic versioning.
This means:

- Major `1.0.0`: I’m breaking the interface of a package
- Minor `0.1.0`: I’m adding new functionality to a package
- Patch `0.0.1`: I’m fixing a bug in existing functionality of a package

Finally, commit and push!

```shell
git add .
git commit
git push
```

Create a PR against the repo.
We’ll get to it and verify the changes.
If all is well, we’ll approve and merge your change into `master`.

### Prereleases

We generally use the `beta` dist-tag to publish prerelease versions of `skuba`.

The workflow looks something like this:

```shell
# Get onto the beta branch
git switch beta

# Reset the beta branch to the point that you want to publish (e.g. the HEAD of the the default branch)
git reset --hard origin/master

# Update versions
yarn changeset pre enter beta
yarn changeset version

# You may need to manually increment the version in CHANGELOG.md and package.json
cat CHANGELOG.md
cat package.json

# Push!
git push
```

This will release your branch as `X.X.X-beta.X` as a Git tag and a new version of the `skuba` npm package.
