---
parent: Migration guides
---

# @seek/seek-module-toolkit

---

## TL;DR

```shell
# Ensure you're using @seek/seek-module-toolkit v4 or later.
# Renovate should automatically open a PR for this upgrade.
# If you haven't configured Renovate on your repository, reach out in `#github`.
yarn smt version
# smt version 5.0.0

# Upgrade ESLint and Prettier configs first via interactive prompt.
# You can skip to `yarn smt migrate` if you're feeling adventurous.
yarn smt configure

# Expect to manually fix some linting violations.
# See the Formatting and linting section.
yarn format

# Migrate to skuba via interactive prompt.
yarn smt migrate

# Ensure your files are being bundled as expected.
# See the Building section.
yarn build && npm pack
```

---

## Building

```shell
smt build → skuba build-package
```

`@seek/seek-module-toolkit` compiles your code to:

- `/lib/commonjs`: CommonJS module-compatible code
- `/lib/es2015`: ES2015 module-compatible code
- `/lib`: TypeScript types

This presents issues when referencing non-JS assets,
as the compiled code is nested one level deeper than the source code.

**skuba** compiles your code to:

- `/lib-commonjs`: CommonJS module-compatible code
- `/lib-es2015`: ES2015 module-compatible code
- `/lib-types`: TypeScript types

You should remove workarounds such as:

- Copying non-JS assets into `/lib` so that they are in the parent directory of the referencing code.

  You can include these assets directly in your `package.json#/files` array.

- Varying the referenced path of non-JS assets based on whether the code is source or compiled (i.e. using `__filename`).

After running `skuba configure`,
double check that the `package.json` fields look sensible.
Expect something like this:

```jsonc
{
  "files": [
    "lib*/**/*.d.ts",
    "lib*/**/*.js",
    "lib*/**/*.js.map",
    "lib*/**/*.json",
  ],
  "main": "./lib-commonjs/index.js",
  "module": "./lib-es2015/index.js",
  "types": "./lib-types/index.d.ts",
}
```

You may test out the packaging changes by either:

- Pushing your changes to a `beta` Git branch, which releases a beta version on npm.

  In a consuming repo, you can then `yarn install` the beta version to give it a whirl.

- Locally packaging with `yarn build`, then `npm pack`.

  In a consuming repo, you can then `yarn add ../path/to/package.tgz` the local version to give it a whirl.

---

## Formatting and linting

```shell
smt format → skuba format

smt format:check → skuba lint

smt lint → skuba lint
```

`@seek/seek-module-toolkit` <= 4 retained support for [TSLint] configurations.
[TSLint is deprecated and will go out of support by December 2020.](https://github.com/palantir/tslint/issues/4534)

**skuba** enforces [ESLint] and bundles a more modern set of linting rules.
See our [ESLint guide] for some tips, and reach out in [#typescriptification] if you get stuck on anything.

[#typescriptification]: https://slack.com/app_redirect?channel=CDCPCEPV3
[eslint]: https://eslint.org/
[eslint guide]: ../deep-dives/eslint.md
[tslint]: https://palantir.github.io/tslint/

## Committing and releasing

```shell
smt commit →
smt release → skuba release
```

`@seek/seek-module-toolkit` installs a `commit-msg` Git hook that may cause issues on your local machine after migration.
We try to clean this up as part of `smt migrate`,
but if you get the following error on `git commit`:

```text
Error: Cannot find module '@seek/seek-module-toolkit/lib/commit-msg'
```

You can manually fix it up with:

```text
rm .git/hooks/commit-msg
```

**skuba** has not implemented any Git hooks of its own,
but it still uses [semantic-release] under the hood and expects [Conventional Commits]:

- No release

  ```text
  chore(scope): Update documentation
  ```

- Patch release 0.0.X: fixes or tweaks to existing functionality

  ```text
  fix(scope): Squash a bug
  ```

- Minor release 0.X.0: new, backwards-compatible functionality

  ```text
  feat(scope): Add a feature
  ```

- Major release X.0.0: backwards-incompatible modification

  ```text
  fix(scope): Close security holes

  BREAKING CHANGE: We deleted all our code.
  ```

  Note that the `fix` type could be anything;
  the `BREAKING CHANGE:` prefix in the commit body is what determines the release as major.

[conventional commits]: https://www.conventionalcommits.org/en/v1.0.0-beta.2/
[semantic-release]: https://github.com/semantic-release/semantic-release/
