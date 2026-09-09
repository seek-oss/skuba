# @skuba-lib/changesets-changelog

An opinionated changelog generator for [Changesets](https://github.com/changesets/changesets), used by skuba-managed projects.

This package provides a single changelog generator that:

- **Links GitHub metadata** (PR links, commit links) from the changeset commit.
- **Bolds conventional commit scopes** (e.g. `feat(api): ...` becomes `**api:** ...`) for consistent formatting across changelogs.
- **Linkifies bare issue references** (e.g. `#1234`) in changeset summaries.
- **Supports preamble injection** via a `skuba-changelog-inject` CLI, which prepends content from `.changeset/.PREAMBLE.md` into the generated `CHANGELOG.md` — useful for adding migration guides or release highlights to major versions.

## Usage

### 1. Configure Changesets

In your `.changeset/config.json`, set the changelog generator:

```json
{
  "changelog": ["@skuba-lib/changesets-changelog", { "repo": "org/repo" }]
}
```

### 2. Set up GitHub integration

Provide a GitHub personal access token with the `read:user` and `repo:status` scopes:

```sh
export GITHUB_TOKEN=your_token_here
```

`GITHUB_TOKEN` is required. Without it, `changeset version` fails with an error prompting you to create one.

A `.env` file in the working directory is loaded automatically (via `util.parseEnv`) and is not written into `process.env`.

### 3. Inject a release preamble (optional)

To prepend custom content to a release — such as a migration guide — create `.changeset/.PREAMBLE.md` before running `changeset version`. Then run the inject script after:

```sh
pnpm skuba-changelog-inject
```

This inserts the preamble into `CHANGELOG.md` and removes `.PREAMBLE.md` automatically.

## Options

Pass options as the second item in the `changelog` array:

```json
{
  "changelog": [
    "@skuba-lib/changesets-changelog",
    {
      "repo": "org/repo",
      "disableThanks": false,
      "disableDependencyLinks": false,
      "template": "\n- {summary} {ref}"
    }
  ]
}
```

### `repo`

- **Type:** `string`
- **Default:** `GITHUB_REPOSITORY`

The `org/repo` slug of your GitHub repository. If you run `changeset version` locally, set this option or export `GITHUB_REPOSITORY`.

GitHub Actions sets `GITHUB_REPOSITORY` automatically, so you can omit `repo` when versioning only runs in CI.

### `disableThanks`

- **Type:** `boolean`
- **Default:** `true`

When `true` (the default), each line omits `Thanks [@user]!`.

Set `"disableThanks": false` to include author attribution from the associated PR or commit, or from `author:` / `user:` lines in the changeset summary.

If you use a `template` with `{authors}`, also set `"disableThanks": false`. Otherwise `{authors}` is empty.

### `disableDependencyLinks`

- **Type:** `boolean`
- **Default:** `true`

When `true` (the default), the internal-dependency section omits commit links:

```md
- Updated dependencies:
  - package@version
```

Set `"disableDependencyLinks": false` to include commit links from the changesets that bumped those dependencies:

```md
- Updated dependencies [[`abc1234`](url)]:
  - package@version
```

### `template`

- **Type:** `string`
- **Experimental**

Overrides the default line format with a token string. Extra lines of a multi-line summary are always appended below the template.

The token syntax may change in a patch. Pin this package if you rely on it.

| Token       | Description                                                                     | Example                  |
| ----------- | ------------------------------------------------------------------------------- | ------------------------ |
| `{summary}` | First line of the changeset, with scopes bolded and bare `#n` issue refs linked | `**api:** fix the thing` |
| `{ref}`     | Parenthesized PR link, or commit link if there is no PR                         | `([#123](url))`          |
| `{pull}`    | PR link, if available                                                           | `[#123](url)`            |
| `{commit}`  | Commit link, if available                                                       | ``[`abc1234`](url)``     |
| `{authors}` | Author links (empty unless `"disableThanks": false`)                            | `[@ghost](url)`          |

Default output (with GitHub metadata) looks like:

```md
- fix the thing ([#123](https://github.com/<org>/<repo>/pull/123) [`a1b2c3d`](https://github.com/<org>/<repo>/commit/a1b2c3d))
```

With `"disableThanks": false`:

```md
- fix the thing ([#123](https://github.com/<org>/<repo>/pull/123) [`a1b2c3d`](https://github.com/<org>/<repo>/commit/a1b2c3d)) Thanks [@ghost](https://github.com/ghost)!
```

| `template`               | Generated Markdown              |
| ------------------------ | ------------------------------- |
| `"\n- {summary} {ref}"`  | `- fix the thing ([#123](url))` |
| `"\n- {summary} {pull}"` | `- fix the thing [#123](url)`   |

## Environment variables

| Variable             | Purpose                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`       | Required. `changeset version` fails without it.                                                                  |
| `GITHUB_REPOSITORY`  | Default `org/repo` when `repo` is omitted. Set automatically in GitHub Actions.                                  |
| `GITHUB_SERVER_URL`  | GitHub host. Defaults to `https://github.com`. Set this (and `GITHUB_GRAPHQL_URL`) for GitHub Enterprise Server. |
| `GITHUB_GRAPHQL_URL` | GraphQL endpoint for GitHub Enterprise Server, e.g. `https://github.example.com/api/graphql`.                    |

## Changeset summary keywords

These lines are stripped from the published changelog and override GitHub metadata when present:

```md
pr: 123
commit: abcdef0
author: @ghost
```

`pull` / `pull request` work like `pr`. `user` works like `author`. Repeat `author:` for multiple people.
