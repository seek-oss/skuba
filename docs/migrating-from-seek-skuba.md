# Migrating from `@seek/skuba`

## 1. Upgrade to `@seek/skuba@3.7.0`

Renovate should automatically open a PR for this upgrade.
If you haven't configured Renovate on your repository,
reach out in `#github`.

We've introduced some new linting rules via ESLint 7 + `typescript-eslint` 3.
If you're stuck on something and the tips in the [`seek-module-toolkit` guide](./migrating-from-seek-module-toolkit.md#formatting-and-linting) aren't helping,
reach out in `#typescriptification`.

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

`skuba` will switch out the following dependencies and rewrite their import paths:

- `@seek/koala → seek-koala`
- `@seek/node-datadog-custom-metrics → seek-datadog-custom-metrics`
- `@seek/skuba → skuba`
- `@seek/skuba-dive → skuba-dive`
