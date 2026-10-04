---
parent: Deep dives
---

# pnpm

---

[pnpm] is the recommended package manager of choice for TypeScript projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** serves as a wrapper for numerous developer tools such as TypeScript, Vitest, Oxfmt & ESLint,
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
├── oxfmt
├── skuba
├── vitest
└── other-skuba-deps
```

However, this behaviour can lead to some [silly bugs] when updating packages.

### pnpm in skuba

pnpm addresses the hoisting issue with a [symlinked structure].
Each package is guaranteed to resolve compatible versions of its dependencies, rather than whichever versions were incidentally hoisted.

This behaviour is a double-edged sword for a toolkit like **skuba**.
Dependencies like Oxfmt and ESLint end up nested in a `node_modules/skuba/node_modules` subdirectory,
where most editor and developer tooling integrations will not know to look.

```console
node_modules
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── oxfmt -> ../../oxfmt@0.64.0
    └── oxfmt@0.64.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

### pnpm-workspace.yaml

pnpm allows us to specify dependencies to hoist via command line or [`pnpm-workspace.yaml`].
The number of package patterns we need to hoist may fluctuate over time,
so specifying hoist patterns via command line would be difficult to maintain.

The **skuba**-maintained `pnpm-workspace.yaml` ([previously `.npmrc`](https://github.com/seek-oss/skuba/issues/1806)) currently instructs pnpm to hoist certain dependencies.

```yaml
publicHoistPattern:
  - '@eslint/*' # Managed by skuba
  - '@types*' # Managed by skuba
  - esbuild # Managed by skuba
  - eslint # Managed by skuba
  - oxfmt # Managed by skuba
  - tsconfig-seek # Managed by skuba
  - '@vitest/*' # Managed by skuba
  - vitest # Managed by skuba
```

From the previous example, this will produce the following `node_modules` layout,
allowing external integrations to find `oxfmt` in `node_modules/oxfmt` as before.

```console
node_modules
├── oxfmt -> ./.pnpm/oxfmt@0.64.0
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── oxfmt -> ../../oxfmt@0.64.0
    └── oxfmt@0.64.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

### Security controls

Beyond hoisting, **skuba** configures several pnpm security features in `pnpm-workspace.yaml`.

#### Minimum release age

`minimumReleaseAge: 4320` prevents installing packages published less than 72 hours ago (4320 minutes).
This protects against malicious packages published in the window before an npm compromise is discovered.

Additional trusted packages can be excluded from this restriction using `minimumReleaseAgeExclude`:

```yaml
minimumReleaseAgeExclude:
  - '@seek/*' # Managed by skuba
  - skuba # Managed by skuba
  - my-trusted-package
```

#### Allow builds

`allowBuilds` is an explicit allowlist of packages permitted to run lifecycle scripts (e.g. `postinstall`).
pnpm will block build scripts from any package not listed here, reducing the risk of malicious code execution during `pnpm install`.

Common entries managed by **skuba** include native addons such as `esbuild`, `dd-trace`, and `@datadog/*` packages.
If your project depends on other packages that require build scripts, add them to your own `allowBuilds` section.

```yaml
allowBuilds:
  esbuild: true # Managed by skuba
  my-trusted-package: true
```

---

## Upgrading to pnpm v11

**skuba** moves projects from pnpm v10 to [pnpm v11] through an [upgrade patch].
Running `pnpm skuba format` applies pnpm's [`pnpm-v10-to-v11` codemod],
which rewrites the mechanical configuration changes,
then reapplies the **skuba**-managed settings in `pnpm-workspace.yaml`.

The rest of this section covers the changes that the codemod cannot make for you.
SEEKers can work through those with the [pnpm v11 migration skill].

### Node.js 22 or newer is required

pnpm v11 drops Node.js 18, 19, 20 and 21, and is distributed as pure ESM.
Run [`skuba migrate node24`](../cli/migrate.md#skuba-migrate-node24) first if your project is still on Node.js 20.

### Build scripts must be allowlisted

`strictDepBuilds` now defaults to `true`,
so `pnpm install` fails rather than warns when a dependency wants to run a lifecycle script that is not in [`allowBuilds`](#allow-builds).

`allowBuilds` also replaces the older `onlyBuiltDependencies`, `onlyBuiltDependenciesFile`, `neverBuiltDependencies`, `ignoredBuiltDependencies` and `ignoreDepScripts` settings, which have all been removed.
Unlike those settings, it is a map of package name patterns to booleans rather than a list.

### Other supply chain defaults are now on

| Setting                   | New default |
| ------------------------- | ----------- |
| `blockExoticSubdeps`      | `true`      |
| `minimumReleaseAge`       | `1440`      |
| `optimisticRepeatInstall` | `true`      |
| `verifyDepsBeforeRun`     | `install`   |

**skuba** raises `minimumReleaseAge` to `4320` (72 hours) and sets `trustPolicy: no-downgrade`.
See [Security controls](#security-controls) for how to grant exemptions.

**skuba** picks the managed settings to write based on the pnpm major version your project pins through `packageManager` or `devEngines.packageManager`,
so a project that stays on pnpm v10 keeps its v10 settings while v11 and v12 projects get the current ones.
A project that pins no pnpm version at all is left alone.

### `.npmrc` is auth and registry only

pnpm no longer reads other settings from `.npmrc`, `package.json#pnpm`, or `npm_config_*` environment variables.
Move any remaining settings into `pnpm-workspace.yaml` with camelCase keys,
and rename any `npm_config_*` variables you set in CI, Dockerfiles or shell profiles to `pnpm_config_*`.

### Removed settings

- `packageManagerStrictVersion`, `packageManagerStrict` and `managePackageManagerVersions` are replaced by [`pmOnFail`], which **skuba** sets to `error`.
  The `COREPACK_ENABLE_STRICT` environment variable is no longer honoured.
- `ignorePatchFailures` is gone; a patch that fails to apply now throws.
- `allowNonAppliedPatches` is renamed to `allowUnusedPatches`.
- `auditConfig.ignoreCves` is renamed to `auditConfig.ignoreGhsas`, so each `CVE-YYYY-NNNNN` entry needs to be swapped for its `GHSA-xxxx-xxxx-xxxx` equivalent.
- `pnpm server` is gone, `pnpm install -g` requires `pnpm add -g <pkg>`, and `pnpm link <pkg>` only accepts paths.

### Scripts shadow built-in commands

If your `package.json` declares a script named `clean`, `setup`, `deploy` or `rebuild`,
`pnpm <name>` now runs your script instead of the built-in command.
Use `pnpm pm <name>` when you want the built-in.

### pnpmfiles can be ESM

`.pnpmfile.mjs` takes priority over `.pnpmfile.cjs` when both are present, and only one is loaded.
[`pnpm-plugin-skuba`] now ships an ESM `pnpmfile.mjs`, so bump it to its latest version alongside the pnpm upgrade.

### Lambdas and `NodejsFunction`

`skuba format` **skips** the pnpm v11 upgrade in projects that use `NodejsFunction` from `aws-cdk-lib/aws-lambda-nodejs`,
whether it is imported directly or through the `aws_lambda_nodejs` namespace:

```console
Patch skipped: Migrate pnpm v10 to v11 - aws-cdk-lib NodejsFunction cannot bundle its dependencies under pnpm v11
```

Such projects stay on pnpm v10 until they move off the construct, and keep receiving the pnpm v10 managed settings.

`NodejsFunction` bundles at `cdk synth` time,
and when you pass `bundling.nodeModules` it runs `pnpm install` in its output directory to produce a real `node_modules`.
Before that install, CDK unconditionally writes an **empty** `pnpm-workspace.yaml` into the output directory so that pnpm does not walk up to your repository root.

Under pnpm v10's defaults this was harmless.
Now that `strictDepBuilds` is on, any dependency with a lifecycle script has to appear in `allowBuilds` —
and those entries live in the very `pnpm-workspace.yaml` that CDK has just overwritten:

```console
ERR_PNPM_INSTALL_SCRIPTS_NOT_ALLOWED  cpu-features@1.x.x is not allowed to run install scripts
```

The construct offers no hook late enough to fix this.
`commandHooks.beforeInstall` runs _before_ CDK writes the empty `pnpm-workspace.yaml`, so anything it writes is discarded ([aws/aws-cdk#37898]).
pnpm makes this harder still by exporting its strict build and trust policy settings to child processes as environment variables without the matching `allowBuilds` and `trustPolicyExclude` allowlists ([pnpm/pnpm#10988]),
so a nested install inherits the strictness but not the exemptions.

Rather than reimplement `allowBuilds` handling in an `afterBundling` hook,
bundle your Lambdas yourself with [`Rolldown.lambdaAsset`] and hand the output directory to `aws_lambda.Code.fromAsset`.
The plugin stages your real `pnpm-workspace.yaml`, `.npmrc`, pnpmfile, `patches` directory and lockfile into the output directory before installing,
so pnpm v11's defaults are satisfied.
It also decouples bundling from `cdk synth`: your Lambda is built once by `skuba build`.

---

## Migrating from Yarn 1.x to pnpm

This migration guide assumes that your project was scaffolded with a **skuba** template.

1. Install **skuba** 11.0.0 or greater

2. Add a `packageManager` key to `package.json`

   ```json
   "packageManager": "pnpm@12.8.1",
   ```

3. Install pnpm

   ```bash
   corepack enable && corepack install
   ```

   (Check the [install guide] for alternate methods)

4. Create [`pnpm-workspace.yaml`]

   Skip this step if your project does not use Yarn workspaces.

   ```yaml
   packages:
     # all packages in direct subdirectories of packages/
     - 'packages/*'
   ```

   (Optional) If your sub-package `package.json`s reference one another using the syntax `foo: *`,
   you can replace these references with the [workspace protocol] using the syntax `foo: workspace:*`.

5. Run `pnpm add --config pnpm-plugin-skuba`

6. Run `pnpm import && rm yarn.lock`

   This converts `yarn.lock` to `pnpm-lock.yaml`.

7. Include additional hoisting settings in `pnpm-workspace.yaml` for Serverless

   Skip this step if your project does not use Serverless.
   It can also be skipped for Serverless projects that use `esbuild` bundling.

   ```diff
     configDependencies:
       pnpm-plugin-skuba: 2.0.0+sha512-nhxd9TdhOOXJ1bcQaqtDiI02gbxhJ8lTw3ZzSHDJPqIbbtnABQT7nLKqLX2zKi7tbfRI8+QSgL3eR2d/QFOLew==
   +
   + # Required for Serverless packaging
   + nodeLinker: hoisted
   + shamefullyHoist: true
   ```

8. Run `rm -rf node_modules && pnpm install`

   This will ensure your local workspace will not have any lingering hoisted dependencies from `yarn`.

   If you have a monorepo, delete all sub-package `node_modules` directories.

9. Run `pnpm skuba lint`

   After running `pnpm install`,
   you may notice that some module imports no longer work.
   This is intended behaviour as these packages are no longer hoisted by default.
   Explicitly declare these as `dependencies` or `devDependencies` in `package.json`.

   For example:

   ```shell
   Cannot find module 'foo'. Did you mean to set the 'moduleResolution' option to 'nodenext', or to add aliases to the 'paths' option? ts(2792)
   ```

   Run `pnpm install foo` to resolve this error.

10. Modify `Dockerfile` or `Dockerfile.dev-deps`

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
    + RUN --mount=type=bind,source=package.json,target=package.json \
    +     --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    +     --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    +     --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    +     pnpm fetch
    ```

    Move the `dst` of the ephemeral `.npmrc` from `/workdir/.npmrc` to `/root/.npmrc`,
    and use a [bind mount] in place of `COPY` to mount `pnpm-lock.yaml`.

    [`pnpm fetch`] does not require `package.json` to be copied to resolve packages;
    trivial updates to `package.json` like a change in `scripts` will no longer result in a cache miss.
    `pnpm fetch` is also optimised for monorepos and does away with the need to copy nested `package.json`s.
    However, this command only serves to populate a local package store and stops short of installing the packages,
    the implications of which are covered in the next step.

    If using [the newer `GET_NPM_TOKEN` environment variable](./npm.md),
    your fetch command should instead look like:

    ```dockerfile
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
        --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
        --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
        --mount=type=secret,id=NPM_TOKEN,env=NPM_TOKEN,required=true \
        pnpm fetch
    ```

    Review [`Dockerfile.dev-deps`] from the new `koa-rest-api` template as a reference point.

11. Replace `yarn` with `pnpm` in `Dockerfile`

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
    + RUN pnpm prune --prod

      ###

      FROM --platform=arm64 gcr.io/distroless/nodejs20-debian12 AS runtime
      WORKDIR /workdir

      COPY --from=build /workdir/lib lib
    - COPY --from=deps /workdir/node_modules node_modules
    + COPY --from=build /workdir/node_modules node_modules

      ENV NODE_ENV=production
    ```

12. Modify plugins in `.buildkite/pipeline.yml`

    Following the Dockerfile changes, apply the analogous changes to the Buildkite pipeline.

    We are using an updated caching syntax on `package.json` which caches only on the `packageManager` key. This requires the [seek-oss/docker-ecr-cache](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin) plugin version to be >= 2.2.0.

    If using the older `private-npm` setup:

    ```diff
      seek-oss/private-npm#v1.3.0:
        env: NPM_READ_TOKEN
    +   output-path: /tmp/
    ```

    ```diff
    - seek-oss/docker-ecr-cache#v2.1.0:
    + seek-oss/docker-ecr-cache#v3.0.0:
        cache-on:
    -     - package.json
    -     - yarn.lock
    +     - package.json#.packageManager
    +     - pnpm-lock.yaml
    +     - pnpm-workspace.yaml
        dockerfile: Dockerfile.dev-deps
    -   secrets: id=npm,src=.npmrc
    +   secrets: id=npm,src=/tmp/.npmrc
    ```

    If using [the newer `GET_NPM_TOKEN` environment variable](./npm.md) to abstract away `aws-sm` / `private-npm`, your pipeline docker-ecr-cache plugin should look like:

    ```yaml
    - seek-oss/docker-ecr-cache#v3.0.0:
        cache-on:
          - pnpm-workspace.yaml
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        secrets:
          - id=npm,src=/var/lib/buildkite-agent/.npmrc
          - NPM_TOKEN
    ```

13. Run `pnpm install --offline` and replace `yarn` with `pnpm` in `.buildkite/pipeline.yml`

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

14. Search for other references to `yarn` in your project. Replace these with `pnpm` where necessary.

    For example, you may have the lockfile listed in `.github/CODEOWNERS`:

    ```diff
    - yarn.lock
    + pnpm-lock.yaml
    ```

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

[`pnpm-workspace.yaml`]: https://pnpm.io/pnpm-workspace_yaml
[`Dockerfile.dev-deps`]: https://github.com/seek-oss/skuba/blob/main/template/koa-rest-api/Dockerfile.dev-deps
[`pmOnFail`]: https://pnpm.io/settings#pmonfail
[`pnpm fetch`]: https://pnpm.io/cli/fetch
[`pnpm-plugin-skuba`]: https://github.com/seek-oss/skuba/tree/main/packages/pnpm-plugin-skuba
[`pnpm-v10-to-v11` codemod]: https://pnpm.io/migration
[`Rolldown.lambdaAsset`]: ../development-api/rolldown.md#lambdaasset
[aws/aws-cdk#37898]: https://github.com/aws/aws-cdk/issues/37898
[bind mount]: https://docs.docker.com/engine/reference/builder/#run---mounttypebind
[pnpm v11 migration skill]: TODO
[pnpm v11]: https://pnpm.io/blog/releases/11.0
[pnpm/pnpm#10988]: https://github.com/pnpm/pnpm/issues/10988
[upgrade patch]: ../cli/lint.md#patches
[contribute a change]: https://seek-oss.github.io/skuba/CONTRIBUTING.html#i-want-to-contribute-a-change
[edited on GitHub]: https://github.com/seek-oss/skuba/edit/main/docs/deep-dives/pnpm.md
[install guide]: https://pnpm.io/installation
[pnpm]: https://pnpm.io/
[silly bugs]: https://www.kochan.io/nodejs/pnpms-strictness-helps-to-avoid-silly-bugs.html
[start a discussion]: https://seek-oss.github.io/skuba/CONTRIBUTING.html#i-want-to-discuss-or-report-something
[symlinked structure]: https://pnpm.io/symlinked-node-modules-structure
[workspace protocol]: https://pnpm.io/workspaces#workspace-protocol-workspace
[yarn]: https://classic.yarnpkg.com/
