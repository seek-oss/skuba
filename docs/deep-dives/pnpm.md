---
parent: Deep dives
---

# pnpm

---

pnpm is the recommended package manager of choice for TypeScript projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** serves a wrapper for numerous developer tools such as TypeScript, Jest, Prettier & ESLint,
abstracting the dependency management of those packages across SEEK projects.
When you are using **skuba**,
you do not need to declare these packages as direct `devDependencies`.
In our previously-recommended package manager, [Yarn], these packages and others are automatically hoisted to create a flattened dependency tree.

```json
{
  "devDependencies": {
    "skuba": "7.2.0"
  }
}
```

```
node_modules
├── jest
├── prettier
├── skuba
└── other-skuba-deps
```

However, this behaviour can lead to some [silly bugs] when updating packages.

## pnpm in skuba

[pnpm] addresses the hoisting issue with a [symlinked structure].
Each package is guaranteed to resolve compatible versions of its dependencies, rather than whichever versions were incidentally hoisted.

This behaviour is a double-edged sword for a toolkit like **skuba**.
Dependencies like Prettier and ESLint end up nested in a `node_modules/skuba/node_modules` subdirectory,
where most editor and developer tooling integrations will not know to look.

```
node_modules
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── prettier -> ../../prettier@3.0.0
    └── prettier@3.0.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

#### .npmrc

pnpm allows us to specify dependencies to hoist via command line or [`.npmrc`].
The number of package patterns we need to hoist may fluctuate over time,
so specifying hoist patterns via command line would be difficult to maintain.

The **skuba**-maintained `.npmrc` currently instructs pnpm to hoist the following dependencies:

```
# managed by skuba
public-hoist-pattern[]="@types*"
public-hoist-pattern[]="*eslint*"
public-hoist-pattern[]="*prettier*"
public-hoist-pattern[]="esbuild"
public-hoist-pattern[]="jest"
public-hoist-pattern[]="tsconfig-seek"
# end managed by skuba
```

From the previous example, this will produce the following `node_modules` layout,
allowing external integrations to find `prettier` in `node_modules/prettier` as before.

```
node_modules
├── prettier -> ./.pnpm/prettier@3.0.0
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── prettier -> ../../prettier@3.0.0
    └── prettier@3.0.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

Committing pnpm configuration in `.npmrc` can conflict with build pipelines that synthesise an ephemeral `.npmrc` to access private SEEK packages on the npm registry.
A solution to this problem is detailed in the migration guide below.

## Migrating to pnpm from Yarn or npm

This migration guide assumes that your project was scaffolded with a **skuba** template.

1. Install **skuba** 7.4.0 or greater

2. Install pnpm

   Run the following on macOS:

   ```bash
   brew install pnpm
   ```

   (Check the [install guide] for other operating systems.)

3. Add a `packageManager` key to `package.json`

   ```json
   "packageManager": "pnpm@8.15.1",
   ```

4. Create [`pnpm-workspace.yaml`](https://pnpm.io/pnpm-workspace_yaml)

   Skip this step if your project does not use Yarn workspaces.

   ```yaml
   packages:
     # all packages in direct subdirectories of packages/
     - 'packages/*'
   ```

5. Run [`pnpm import`]

   This converts a `package-lock.json` or `yarn.lock` into a `pnpm-lock.yaml`.

6. Delete `package-lock.json` or `yarn.lock`

7. Run `skuba format`

   This will synthesise managed hoist patterns into `.npmrc`.

8. Include additional hoisting settings in `.npmrc`

   Skip this step if your project does not use Serverless.

   ```diff
   # managed by skuba
   public-hoist-pattern[]="@types*"
   public-hoist-pattern[]="*eslint*"
   public-hoist-pattern[]="*prettier*"
   public-hoist-pattern[]="esbuild"
   public-hoist-pattern[]="jest"
   public-hoist-pattern[]="tsconfig-seek"
   # end managed by skuba
   +
   + # Required for Serverless packaging
   + node-linker=hoisted
   + shamefully-hoist=true
   ```

9. Run `pnpm install`

10. Handle transitive dependency issues

    After running `pnpm install`,
    you may notice that some module imports no longer work.
    This is intended behaviour as these packages are no longer hoisted by default.
    Explicitly declare these as `dependencies` or `devDependencies` in `package.json`.

    For example:

    ```
    Cannot find module 'foo'. Did you mean to set the 'moduleResolution' option to 'nodenext', or to add aliases to the 'paths' option? ts(2792)
    ```

    Run `pnpm install foo` to resolve this error.

11. Modify `Dockerfile` or `Dockerfile.dev-deps`

    Your build pipeline may have previously mounted an ephemeral `.npmrc` with an auth token at `/workdir`.
    This needs to be mounted elsewhere to avoid overwriting the new pnpm configuration stored in `.npmrc`.

    ```diff
      FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS dev-deps

    + RUN corepack enable pnpm
    + RUN pnpm config set store-dir /root/.pnpm-store

      WORKDIR /workdir

    - COPY package.json yarn.lock ./
    - COPY packages/foo/package.json packages/foo/

    - RUN --mount=type=secret,id=npm,dst=/workdir/.npmrc \
    -     yarn install --frozen-lockfile --ignore-optional --non-interactive
    + RUN --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    +     --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    +     pnpm fetch
    ```

    The `dst` of the ephemeral `.npmrc` can be moved from `/workdir/.npmrc` to `/root/.npmrc`,
    and a [bind mount] can be used in place of `COPY` to mount `pnpm-lock.yaml`.

    [`pnpm fetch`] can does not require `package.json` to be copied to resolve packages;
    trivial updates to `package.json` like a change in `scripts` will no longer result in a cache miss.
    `pnpm fetch` is also optimised for monorepo setups and does away with the need to copy nested `package.json`s.
    However, this command only serves to populate a local store and stops short of installing the packages,
    the implications of which are covered in the next step.

    Review [`Dockerfile.dev-deps`] from the new `koa-rest-api` template as a reference point.

12. Replace `yarn` with `pnpm` in `Dockerfile`

    As `pnpm fetch` does not actually install dependencies,
    run a subsequent `pnpm install --offline` before any command which may reference a dependency.
    Swap out `yarn` commands for `pnpm run` commands,
    and drop the unnecessary `AS deps` stage.

    ```diff
      ###
    -
    - FROM ${BASE_IMAGE} AS deps
    -
    - RUN yarn install --ignore-optional --ignore-scripts --non-interactive --offline --production
    -
    - ###
    -
      FROM ${BASE_IMAGE} AS build

      COPY . .

    - RUN yarn build
    + RUN pnpm install --offline
    + RUN pnpm run build
    + RUN pnpm install --offline --prod

      ###

      FROM --platform=${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs20-debian12 AS runtime
      WORKDIR /workdir

      COPY --from=build /workdir/lib lib
    -
    - COPY --from=deps /workdir/node_modules node_modules
    + COPY --from=build /workdir/node_modules node_modules

      ENV NODE_ENV=production
    ```

13. Modify plugins in `.buildkite/pipeline.yml`

    Your build pipeline may have previously output an ephemeral `.npmrc` with an auth token on the build agent.
    This needs to be output elsewhere to avoid overwriting the new pnpm configuration stored in `.npmrc`.

    Swap out caching on `package.json` and `yarn.lock` for `pnpm-lock.yaml` at the same time.

    ```diff
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
    +   output-path: tmp/
    ```

    ```diff
     seek-oss/docker-ecr-cache#v2.1.0:
    -  cache-on:
    -    - package.json
    -    - yarn.lock
    +  cache-on: pnpm-lock.yaml
       dockerfile: Dockerfile.dev-deps
    -  secrets: id=npm,src=.npmrc
    +  secrets: id=npm,src=tmp/.npmrc
    ```

14. Replace `yarn` with `pnpm` in `.buildkite/pipeline.yml`

    ```diff
     - label: 🧪 Test & Lint
       commands:
    +    - echo '--- pnpm install --offline'
    +    - pnpm install --offline
    -    - echo '+++ yarn test:ci'
    -    - yarn test:ci
    -    - echo '--- yarn lint'
    -    - yarn lint
    +    - echo '+++ pnpm run test:ci'
    +    - pnpm run test:ci
    +    - echo '--- pnpm run lint'
    +    - pnpm run lint
    ```

[`.npmrc`]: https://pnpm.io/npmrc
[`pnpm fetch`]: https://pnpm.io/cli/fetch
[bind mount]: https://docs.docker.com/engine/reference/builder/#run---mounttypebind
[`Dockerfile.dev-deps`]: https://github.com/seek-oss/skuba/blob/master/template/koa-rest-api/Dockerfile.dev-deps
[install guide]: https://pnpm.io/installation
[pnpm]: https://pnpm.io/
[`pnpm import`]: https://pnpm.io/cli/import
[silly bugs]: https://www.kochan.io/nodejs/pnpms-strictness-helps-to-avoid-silly-bugs.html
[symlinked structure]: https://pnpm.io/symlinked-node-modules-structure
[yarn]: https://classic.yarnpkg.com/
