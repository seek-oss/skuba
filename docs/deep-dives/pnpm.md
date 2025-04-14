---
parent: Deep dives
---

# pnpm

---

[pnpm] is the recommended package manager of choice for TypeScript projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** serves as a wrapper for numerous developer tools such as TypeScript, Jest, Prettier & ESLint,
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

```console
node_modules
├── jest
├── prettier
├── skuba
└── other-skuba-deps
```

However, this behaviour can lead to some [silly bugs] when updating packages.

### pnpm in skuba

pnpm addresses the hoisting issue with a [symlinked structure].
Each package is guaranteed to resolve compatible versions of its dependencies, rather than whichever versions were incidentally hoisted.

This behaviour is a double-edged sword for a toolkit like **skuba**.
Dependencies like Prettier and ESLint end up nested in a `node_modules/skuba/node_modules` subdirectory,
where most editor and developer tooling integrations will not know to look.

```console
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

### .npmrc

pnpm allows us to specify dependencies to hoist via command line or [`.npmrc`].
The number of package patterns we need to hoist may fluctuate over time,
so specifying hoist patterns via command line would be difficult to maintain.

The **skuba**-maintained `.npmrc` currently instructs pnpm to hoist the following dependencies:

```shell
# managed by skuba
package-manager-strict-version=true
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

```console
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

---

## Migrating from Yarn 1.x to pnpm

This migration guide assumes that your project was scaffolded with a **skuba** template.

1. Install **skuba** 7.4.0 or greater

2. Add a `packageManager` key to `package.json`

   ```json
   "packageManager": "pnpm@10.7.1",
   ```

3. Install pnpm

   ```bash
   corepack enable && corepack install
   ```

   (Check the [install guide] for alternate methods)

4. Create [`pnpm-workspace.yaml`](https://pnpm.io/pnpm-workspace_yaml)

   Skip this step if your project does not use Yarn workspaces.

   ```yaml
   packages:
     # all packages in direct subdirectories of packages/
     - 'packages/*'
   ```

   (Optional) If your sub-package `package.json`s reference one another using the syntax `foo: *`,
   you can replace these references with the [workspace protocol] using the syntax `foo: workspace:*`.

5. Run `pnpm import && rm yarn.lock`

   This converts `yarn.lock` to `pnpm-lock.yaml`.

6. Run `pnpm skuba format`

7. Remove the `.npmrc` ignore entry from `.gitignore` and `.dockerignore`

   Heed the warning and ensure that a safe `.npmrc` is included in the same commit.

   ```diff
   yarn-error.log
   # end managed by skuba
   -
   - # Ignore .npmrc. This is no longer managed by skuba as pnpm projects use a managed .npmrc.
   - # IMPORTANT: if migrating to pnpm, remove this line and add an .npmrc IN THE SAME COMMIT.
   - # You can use `skuba format` to generate the file or otherwise commit an empty file.
   - # Doing so will conflict with a local .npmrc and make it more difficult to unintentionally commit auth secrets.
   - .npmrc
   ```

   A safe `.npmrc` will be synthesised for you in the next step.

8. Run `pnpm skuba format`

   This will synthesise managed hoist patterns into `.npmrc`.

9. Include additional hoisting settings in `.npmrc` for Serverless

   Skip this step if your project does not use Serverless.
   It can also be skipped for Serverless projects that use `esbuild` bundling.

   ```diff
   # managed by skuba
   package-manager-strict-version=true
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

10. Run `rm -rf node_modules && pnpm install`

    This will ensure your local workspace will not have any lingering hoisted dependencies from `yarn`.

    If you have a monorepo, delete all sub-package `node_modules` directories.

11. Run `pnpm skuba lint`

    After running `pnpm install`,
    you may notice that some module imports no longer work.
    This is intended behaviour as these packages are no longer hoisted by default.
    Explicitly declare these as `dependencies` or `devDependencies` in `package.json`.

    For example:

    ```shell
    Cannot find module 'foo'. Did you mean to set the 'moduleResolution' option to 'nodenext', or to add aliases to the 'paths' option? ts(2792)
    ```

    Run `pnpm install foo` to resolve this error.

12. Modify `Dockerfile` or `Dockerfile.dev-deps`

    Your build pipeline may have previously mounted an ephemeral `.npmrc` with an auth token at `/workdir`.
    This needs to be mounted elsewhere to avoid overwriting the new pnpm configuration stored in `.npmrc`.

    <!-- prettier-ignore -->
    ```diff
      FROM --platform=arm64 node:20-alpine AS dev-deps
    
    + RUN --mount=type=bind,source=package.json,target=package.json \
    +     corepack enable pnpm && corepack install
    
    + RUN --mount=type=bind,source=package.json,target=package.json \
    +     pnpm config set store-dir /root/.pnpm-store
    
      WORKDIR /workdir
    
    - COPY package.json yarn.lock ./
    - COPY packages/foo/package.json packages/foo/
    
    - RUN --mount=type=secret,id=npm,dst=/workdir/.npmrc \
    -     yarn install --frozen-lockfile --ignore-optional --non-interactive
    + RUN --mount=type=bind,source=.npmrc,target=.npmrc \
    +     --mount=type=bind,source=package.json,target=package.json \
    +     --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    +     --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    +     pnpm fetch
    ```
    
    If using [the newer `GET_NPM_TOKEN` environment variable](./npm.md), 
    your fetch command should instead look like:
    
    ```dockerfile
    RUN --mount=type=bind,source=.npmrc,target=.npmrc \
        --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
        --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
        --mount=type=secret,id=NPM_TOKEN,required=true \
        NPM_TOKEN="$(cat /run/secrets/NPM_TOKEN)" pnpm fetch
    ```
    
    Move the `dst` of the ephemeral `.npmrc` from `/workdir/.npmrc` to `/root/.npmrc`,
    and use a [bind mount] in place of `COPY` to mount `pnpm-lock.yaml`.

    [`pnpm fetch`] does not require `package.json` to be copied to resolve packages;
    trivial updates to `package.json` like a change in `scripts` will no longer result in a cache miss.
    `pnpm fetch` is also optimised for monorepos and does away with the need to copy nested `package.json`s.
    However, this command only serves to populate a local package store and stops short of installing the packages,
    the implications of which are covered in the next step.

    Review [`Dockerfile.dev-deps`] from the new `koa-rest-api` template as a reference point.

13. Replace `yarn` with `pnpm` in `Dockerfile`

    As `pnpm fetch` does not actually install packages,
    run a subsequent `pnpm install --offline` before any command which may reference a dependency.
    Swap out `yarn` commands for `pnpm` commands,
    and drop the unnecessary `AS deps` stage.

    <!-- prettier-ignore -->
    ```diff
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
    + RUN pnpm build
    + RUN pnpm install --offline --prod
    
      ###
    
      FROM --platform=arm64 gcr.io/distroless/nodejs20-debian12 AS runtime
      WORKDIR /workdir
    
      COPY --from=build /workdir/lib lib
    - COPY --from=deps /workdir/node_modules node_modules
    + COPY --from=build /workdir/node_modules node_modules
    
      ENV NODE_ENV=production
    ```

14. Modify plugins in `.buildkite/pipeline.yml`

    Your build pipeline may have previously output an ephemeral `.npmrc` with an auth token on the build agent.
    This needs to be output elsewhere to avoid overwriting the new pnpm configuration stored in `.npmrc`.

    Swap out caching on `yarn.lock` for `.npmrc` and `pnpm-lock.yaml` at the same time.

    We are also using an updated caching syntax on `package.json` which caches only on the `packageManager` key. This requires the [seek-oss/docker-ecr-cache](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin) plugin version to be >= 2.2.0.

    If using `private-npm`:
    
    ```diff
      seek-oss/private-npm#v1.3.0:
        env: NPM_READ_TOKEN
    +   output-path: /tmp/
    ```

    ```diff
    - seek-oss/docker-ecr-cache#v2.1.0:
    + seek-oss/docker-ecr-cache#v2.2.1:
        cache-on:
    -     - package.json
    -     - yarn.lock
    +     - .npmrc
    +     - package.json#.packageManager
    +     - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
    -   secrets: id=npm,src=.npmrc
    +   secrets: id=npm,src=/tmp/.npmrc
    ```
    
    If using [the newer `GET_NPM_TOKEN` environment variable](./npm.md) to abstract away `aws-sm` / `private-npm`, your pipeline docker-ecr-cache plugin should look like:

    ```yaml
    - seek-oss/docker-ecr-cache#v2.2.1:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        secrets: 
          - id=npm,src=/var/lib/buildkite-agent/.npmrc
          - NPM_TOKEN
    ```

15. Run `pnpm install --offline` and replace `yarn` with `pnpm` in `.buildkite/pipeline.yml`

    ```diff
     - label: 🧪 Test & Lint
       commands:
    +    - echo '--- pnpm install --offline'
    +    - pnpm install --offline
    -    - echo '+++ yarn test:ci'
    -    - yarn test:ci
    -    - echo '--- yarn lint'
    -    - yarn lint
    +    - echo '+++ pnpm test:ci'
    +    - pnpm test:ci
    +    - echo '--- pnpm lint'
    +    - pnpm lint
    ```

16. Search for other references to `yarn` in your project. Replace these with `pnpm` where necessary.

## FAQ

**Q:** I'm running into `ERR_PNPM_CANNOT_DEPLOY  A deploy is only possible from inside a workspace`

**A:** `pnpm deploy` is a reserved command. Use `pnpm run deploy` instead.

---

**Q:** I'm seeing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "<NAME>" not found` in my pipeline

**A:** Ensure `pnpm install --offline` is referenced earlier within pipeline step as shown in step 14.

---

**Q:** I'm seeing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "workspace" not found` in my pipeline

**A:** `pnpm workspace <PACKAGE_NAME>` does not work. Replace it with the [`--filter`](https://pnpm.io/filtering) flag.

---

## Contributing

This guide is not comprehensive just yet,
and it may not account for certain intricacies of your project.

If you run into an issue that is not documented here,
please [start a discussion] or [contribute a change] so others can benefit from your findings.
This page may be [edited on GitHub].

[`.npmrc`]: https://pnpm.io/npmrc
[`Dockerfile.dev-deps`]: https://github.com/seek-oss/skuba/blob/main/template/koa-rest-api/Dockerfile.dev-deps
[`pnpm fetch`]: https://pnpm.io/cli/fetch
[bind mount]: https://docs.docker.com/engine/reference/builder/#run---mounttypebind
[contribute a change]: https://seek-oss.github.io/skuba/CONTRIBUTING.html#i-want-to-contribute-a-change
[edited on GitHub]: https://github.com/seek-oss/skuba/edit/main/docs/deep-dives/pnpm.md
[install guide]: https://pnpm.io/installation
[pnpm]: https://pnpm.io/
[silly bugs]: https://www.kochan.io/nodejs/pnpms-strictness-helps-to-avoid-silly-bugs.html
[start a discussion]: https://seek-oss.github.io/skuba/CONTRIBUTING.html#i-want-to-discuss-or-report-something
[symlinked structure]: https://pnpm.io/symlinked-node-modules-structure
[workspace protocol]: https://pnpm.io/workspaces#workspace-protocol-workspace
[yarn]: https://classic.yarnpkg.com/
