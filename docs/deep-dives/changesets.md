---
parent: Deep dives
---

# Changesets

---

This topic details the changesets version and release functionality baked into **skuba**. This functionality is based off the [changesets action].

Running `skuba changesets` will run one of two steps: [version](#version) or [publish](#publish).

---

## Setup

1. Create a [.npmrc file] in `$HOME/.npmrc` which contains an [automation token]. You may need to remove any local repository `.npmrc` file. At SEEK we handle this automatically for internal packages via [Gutenberg].
2. Propagate the environment variables documented for [GitHub annotations](#github-annotations)

## Version

This will analyse your repository for changesets and will create or update a pull request with the title 'Version Packages' with updated package versions and changelogs.

## Publish

When the pull request created from the version step is merged the publish step will run and publish packages to npm.

[.npmrc file]: https://docs.npmjs.com/cli/v8/configuring-npm/npmrc
[automation token]: https://docs.npmjs.com/creating-and-viewing-access-tokens
[changesets action]: https://github.com/changesets/action
[github annotations]: ../deep-dives/github.md#github-annotations
[gutenberg]: https://github.com/SEEK-Jobs/gutenberg
