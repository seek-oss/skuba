---
parent: Deep dives
---

# pnpm

---

pnpm is the recommended package manager of choice for projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** simply serves a wrapper for numerous developer tools such as TypeScript, Jest, Prettier & ESLint,
abstracting the dependency management of those packages across SEEK projects.
This means that when you are using **skuba**,
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

[pnpm] addresses the hoisting issue by using a [symlinked structure] which allows every package to use the version range of the package they declared as opposed to the version which may have been hoisted.

This is a double-edged sword when it comes to using **skuba**,
as this means that our dependencies such as Prettier and ESLint become nested within a `node_modules/skuba/node_modules` subdirectory,
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

pnpm allows us to specify dependencies to hoist via command line or [`.npmrc`] file.
However, the number of package patterns we need to hoist may fluctuate,
so specifying hoist patterns via command line would be difficult to maintain.

The **skuba**-maintained `.npmrc` instructs the following dependencies to be hoisted:

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

From the previous example, this will produce the following `node_modules` layout which means that our integrations will now be able to find `prettier` in `node_modules/prettier` like before.

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

## Migrating to pnpm from Yarn or npm

This migration guide assumes that you scaffolded your project with a skuba template.

1. Install **skuba** 7.4.0 or greater

2. Install pnpm

   On macOS you can run the following:

   ```bash
   brew install pnpm
   ```

   For other operating systems you can check the [install guide].

3. Add a `packageManager` key to your `package.json`

   ```json
   "packageManager": "pnpm@8.15.1",
   ```

4. Create [`pnpm-workspace.yaml`](https://pnpm.io/pnpm-workspace_yaml)

   If you are not using Yarn workspaces, you can skip this step.

   ```yaml
   packages:
     # all packages in direct subdirs of packages/
     - 'packages/*'
   ```

5. Run [`pnpm import`]

   This converts your `yarn.lock` or `package-lock.json` into a `pnpm-lock.yaml` file.

6. Delete the `yarn.lock` or `package-lock.json` file.

7. Run `skuba format`

   This will synthesise some managed hoist patterns into `.npmrc`.

8. Include additional hoisting settings into `.npmrc`

   If your application is not using Serverless, you can skip this step.

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

9. Run `pnpm i`

10. Modify your `Dockerfile` or `Dockerfile.dev-deps` files.

    Your application may be mounting a `.npmrc` secret with an auth token at `/workdir` but because we now have a configuration `.npmrc` file we will need to mount this elsewhere.

    ```diff
      FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS dev-deps

    + RUN corepack enable pnpm
    + RUN pnpm config set store-dir /root/.pnpm-store

      WORKDIR /workdir

    - COPY package.json yarn.lock ./
    - COPY packages/foo/package.json packages/foo/

    - RUN --mount=type=secret,id=npm,dst=/workdir/.npmrc \
    -   yarn install --frozen-lockfile --ignore-optional --non-interactive
    + RUN --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    +   --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    +   pnpm fetch
    ```

    Here we are also utilising a [bind mount] instead of the `COPY` to mount the `pnpm-lock.yaml` file.

    We have also replaced the `secret` `dst` location from `/workdir/.npmrc` to `/root/.npmrc`.

    You will also notice that we are no longer copying `package.json` to the `Dockerfile`.

    This is because [`pnpm fetch`] does not require one to resolve packages, which means that trivial updates to the `package.json` file will now no longer result in a cache miss. `pnpm fetch` is also optimised for monorepo setups so if you were previously declaring sub-package folders in your `Dockerfile`, you can remove them completely. The usage of `pnpm fetch` does have some implications which we will cover in the next step.

    You can view the new `koa-rest-api` template [`Dockerfile.dev-deps`] as a reference point.

11. Modify your usages of `yarn` to `pnpm` in `Dockerfile`

    Since we installed our dependencies with `pnpm fetch`, we will now also have to run a `pnpm install -offline` before any command which may call a dependency. You will also need to exchange `yarn` for `pnpm run`. We have also simplified the usage of stages by removing the `AS dep` stage.

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

    - COPY --from=deps /workdir/node_modules node_modules
    + COPY --from=build /workdir/node_modules node_modules

      ENV NODE_ENV=production
    ```

12. Modify your `.buildkite/pipeline.yml` file plugins

    As our application now contains a `.npmrc` file in our `workdir`, we now also need to also change the mount path in our buildkite plugins. We will also be exchanging the `yarn.lock` file for `pnpm-lock.yaml`

    ```diff
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
    +   output-path: tmp/
    ```

    ```diff
     seek-oss/docker-ecr-cache#v2.1.0:
       cache-on:
    -    - package.json
    -    - yarn.lock
    +    - pnpm-lock.yaml
       dockerfile: Dockerfile.dev-deps
    -  secrets: id=npm,src=.npmrc
    +  secrets: id=npm,src=tmp/.npmrc
    ```

13. Modify your usages of `yarn` to `pnpm` in `.buildkite/pipeline.yml`

    Since we installed our dependencies with `pnpm fetch`, we will now also have to run a `pnpm install` before any regular `skuba` command. You will also need to exchange `yarn` for `pnpm run`.

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
