---
parent: Migration guides
---

# @seek/skuba

---

## 1. Upgrade to `@seek/skuba@3.7` or newer

Renovate should automatically open a PR for this upgrade.
If you haven't configured Renovate on your repository,
reach out in `#github`.

To upgrade manually, run:

```shell
yarn upgrade @seek/skuba --latest
```

We've introduced some new linting rules via ESLint 7 + `typescript-eslint` 3.
See our [ESLint guide] for some tips, and reach out in [#typescriptification] if you get stuck on anything.

[eslint guide]: ../deep-dives/eslint.md
[#typescriptification]: https://slack.com/app_redirect?channel=CDCPCEPV3

---

## 2. Switch out packages

If you have a small number of repos,
run the following local commands on each one:

1. `yarn install`
1. `yarn skuba configure`
1. `yarn format`

If you have a large number of repos,
you may `yarn global add skuba` upfront,
then run the following commands on each one:

1. `skuba configure`
1. `yarn format`

Note: You may need to add `yarn global bin` to your PATH for the commands to run. See the Yarn docs under [Path Setup].

[path setup]: https://classic.yarnpkg.com/en/docs/install/#mac-stable

**skuba** will switch out the following dependencies and rewrite their import paths:

- `@seek/koala → seek-koala`
- `@seek/node-datadog-custom-metrics → seek-datadog-custom-metrics`
- `@seek/skuba → skuba`
- `@seek/skuba-dive → skuba-dive`
