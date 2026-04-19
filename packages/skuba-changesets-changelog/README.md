# @skuba-lib/skuba-changesets-changelog

An opinionated changelog generator for [Changesets](https://github.com/changesets/changesets), used by skuba-managed projects.

This package provides a single changelog generator that:

- **Automatically uses GitHub metadata** (PR links, commit links, authors) when `GITHUB_TOKEN` is set, falling back gracefully to Git-based versioning when it isn't.
- **Bolds conventional commit scopes** (e.g. `feat(api): ...` becomes `**api:** ...`) for consistent formatting across changelogs.
- **Supports preamble injection** via a `skuba-changelog-inject` CLI, which prepends content from `.changeset/.PREAMBLE.md` into the generated `CHANGELOG.md` — useful for adding migration guides or release highlights to major versions.

## Usage

### 1. Configure Changesets

In your `.changeset/config.json`, set the changelog generator:

```json
{
  "changelog": ["@skuba-lib/skuba-changesets-changelog", { "repo": "org/repo" }]
}
```

### 2. Set up GitHub integration (recommended)

For GitHub-linked entries (PR links, commit SHAs, authors), provide a GitHub personal access token with the `public_repo` scope:

```sh
export GITHUB_TOKEN=your_token_here
```

Without `GITHUB_TOKEN`, the generator falls back to Git-based versioning and logs a warning.

### 3. Inject a release preamble (optional)

To prepend custom content to a release — such as a migration guide — create `.changeset/.PREAMBLE.md` before running `changeset version`. Then run the inject script after:

```sh
pnpm skuba-changelog-inject
```

This inserts the preamble into `CHANGELOG.md` and removes `.PREAMBLE.md` automatically.
