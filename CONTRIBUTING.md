---
nav_order: 99
---

# Contributing

---

Hi there, thanks for checking out our repo!

**skuba** is a toolkit for developing TypeScript backend applications and packages at SEEK.
While third-party contributions are certainly welcome,
this project is primarily driven by our internal priorities and technical guidelines.

SEEKers: this repo is public,
so don't commit or post anything that isn't ready for the entire world to see.

---

## Getting started

**skuba** is documented through its [README](README.md),
along with some targeted topics under the [docs](docs) directory.
We maintain a [changelog] and [release notes] on GitHub,
and distribute it as an [npm package].

### I want to discuss or report something

[Submit an issue] if you have a question, feature request or bug report.

If you work at SEEK, start a discussion in [#skuba-support].

### I want to contribute a change

Feel free to [create a pull request] for trivial fixes and improvements.

For more substantial features, please [submit an issue] first.
This lets us evaluate whether the feature fits the direction of the project and discuss possible approaches.

If you work at SEEK, start a discussion in [#sig-backend-tooling].

---

## Development

### Prerequisites

**skuba** is predominantly tested on macOS and Linux.
If you're on Windows, we recommend the [Windows Subsystem for Linux].

First, some JavaScript tooling:

- Node.js LTS
- pnpm

Next, install npm dependencies:

```shell
pnpm install
```

### Git workflow

We use [GitHub flow](https://guides.github.com/introduction/flow/).

Create a new branch off of the latest commit on the default branch:

```shell
git fetch origin
git switch --create your-branch-name origin/main
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
If all is well, they will merge your pull request into the default branch.

### Testing

You may find it easier to develop alongside unit tests:

```shell
pnpm test --watch
```

Format your code once you're happy with it:

```shell
pnpm format
```

We run linting and testing in CI,
but consider running these commands locally for a faster feedback loop:

```shell
pnpm lint
pnpm test
```

Our [validate](https://github.com/seek-oss/skuba/blob/main/.github/workflows/validate.yml) GitHub Actions workflow also initialises each built-in **skuba** template and runs through a set of CLI commands.
This can be reproduced locally,
but keep in mind that the script is fairly slow and you'll have to manually clean up afterwards.

```shell
# greeter | koa-rest-api | ...
pnpm test:template greeter

# clean up temporary sibling directory
rm -fr ../tmp-greeter
```

Snapshots in `templates` can be updated with the following command but note that manual clean up is necessary afterwards

```shell
# greeter being name of template
pnpm test:template:updateSnapshot greeter

# clean up temporary sibling directory
rm -fr ../tmp-greeter
```

### Running locally

If you want to try out the **skuba** CLI on itself,
a `pnpm skuba` script is configured:

```shell
# Prints available commands.
pnpm skuba

# Prints version from local package.json.
pnpm skuba version

# Builds skuba using itself.
pnpm skuba build
```

If you want to try out the **skuba** CLI on another local repo,
use [pnpm link]:

```shell
# Do this once upfront.
pnpm link --global

# `pnpm link` points to the JavaScript output in `./lib`.
# This means you'll need to rebuild skuba on every code change 😔.
pnpm build

# Run skuba commands against the other repo.
skuba version

# Avoid command confusion after you're done.
pnpm uninstall --global skuba
```

---

## Releases

### Creating a changeset

We use [Changesets] to manage package releases.
You'll see a 🦋 bot gliding around pull requests.

You should write a changeset if you are changing the public **skuba** interface,
which includes:

- [API](https://github.com/seek-oss/skuba/tree/main/src/api) for Node.js build and test code
- [CLI](https://github.com/seek-oss/skuba/tree/main/src/cli) commands
- [Config](https://github.com/seek-oss/skuba/tree/main/config) presets
- [Template](https://github.com/seek-oss/skuba/tree/main/template) code and documentation
- [npm dependencies](https://github.com/seek-oss/skuba/blob/main/package.json)

On the other hand,
a changeset is not necessary for:

- Documentation like the [README](README.md)
- Internal refactoring that preserves the existing interface
- [npm dev dependencies](https://github.com/seek-oss/skuba/blob/main/package.json)

```shell
pnpm changeset
```

The Changesets CLI is interactive and follows [semantic versioning]:

- Patch release `0.0.X`: fixes or tweaks to existing functionality
- Minor release `0.X.0`: new, backwards-compatible functionality
- Major release `X.0.0`: backwards-incompatible modification

We humour several transgressions to this versioning scheme in practice:

1. Breaking changes to `skuba lint` should be downgraded to minor.

   It's not feasible for us to semantically version based on whether `skuba lint` will pass or fail,
   especially given that lint rules can change between minor and patch versions of transitive ESLint dependencies.
   The general thought here is that changes that can affect the runtime behaviour of your project should be major,
   while changes to build-time validation of a project should not be major.

   We also support [autofixes](https://github.com/seek-oss/skuba/blob/main/docs/deep-dives/github.md#github-autofixes) to ease adoption of lint rule changes.

1. Breaking changes in TypeScript upgrades should be downgraded to minor.

   TypeScript does not follow semantic versioning,
   and its point releases generally come with breaking changes.
   These are typically edge cases that would not affect a typical SEEK project.

   In the event that a new compiler rule presents significant challenges to existing SEEK projects,
   we may turn off the rule by default to revert its impact,
   or publish a major with detailed guidance on how to comply with or disable the rule.

1. Changes to built-in templates should be downgraded to patch.

   Release notes and package versioning are most pertinent to existing projects.
   Once you've run `skuba init`, updates to built-in templates are largely inconsequential to your project,
   and mostly serve as a footnote to communicate best current practices.

Prefix your changeset title with a `scope:`.
This makes it easy to eyeball which part of **skuba** a change relates to.

```text
test: Fix command

template: Add next steps to READMEs

template/koa-rest-api: Switch to Express

format, lint: Introduce new ESLint rule
```

The Changesets CLI will generate a Markdown file under [.changeset](https://github.com/seek-oss/skuba/tree/main/.changeset),
which you should include in your pull request.
It doesn't need to be part of the same commit as the rest of your changes.
Feel free to manually edit this file to include more details about your change.

### Publishing a release

When a pull request with a changeset is merged,
our CI workflow will create a new `Version Packages` PR.
The changesets are used to infer the next semantic version and to update the [changelog].

This PR may be left open to collate multiple changes into the next version.
A maintainer will merge it once ready,
and our [release workflow] will publish the associated GitHub release and npm package version.

### Publishing a prerelease

Prereleases can be created on demand via [seek-oss/changesets-snapshot].

Manually run the [release workflow] on any branch in GitHub Actions to publish a new snapshot version to npm.

<https://www.npmjs.com/package/skuba?activeTab=versions>

[#skuba-support]: https://slack.com/app_redirect?channel=C03UM9GBGET
[#sig-backend-tooling]: https://slack.com/app_redirect?channel=C06QWMV5BSA
[changelog]: CHANGELOG.md
[changesets]: https://github.com/atlassian/changesets
[create a pull request]: https://github.com/seek-oss/skuba/compare
[fork the repo]: https://github.com/seek-oss/skuba/fork
[npm package]: https://www.npmjs.com/package/skuba
[release notes]: https://github.com/seek-oss/skuba/releases
[seek-oss/changesets-snapshot]: https://github.com/seek-oss/changesets-snapshot
[semantic versioning]: https://semver.org/
[release workflow]: https://github.com/seek-oss/skuba/actions/workflows/release.yml
[submit an issue]: https://github.com/seek-oss/skuba/issues/new/choose
[windows subsystem for linux]: https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux
[pnpm link]: https://pnpm.io/cli/link
