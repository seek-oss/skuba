---
parent: CLI
nav_order: 7
---

# Release package

---

## skuba release

Runs a [semantic release] that will publish a package to npm.

## skuba changeset

Creates a pull request with all of the package versions updated and changelogs updated. When the pull request is merged this will publish the package to npm and create a release in the GitHub repository. This matches the functionality of the [changesets action].

```shell
skuba changeset
```

[changesets action]: https://github.com/changesets/action
[semantic release]: https://github.com/semantic-release/semantic-release
