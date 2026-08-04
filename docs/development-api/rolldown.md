---
parent: Development API
---

# Rolldown

---

## lambdaAsset

A [rolldown](https://rolldown.rs) plugin that turns a rolldown output directory into a directory you can deploy as a Lambda function.

The plugin supports ESM output and pnpm only.

You keep full control of your rolldown config.
The plugin does not touch `input`, `output.dir`, `output.format`, or how your code is bundled;
it only augments the output directory once rolldown has written to it:

1. Writes a `package.json` of `"type": "module"`.
2. Installs any `nodeModules` into the output directory with pnpm.
3. Strips the install-only files back out, leaving your bundle, the generated `package.json`, and `node_modules`.
4. Copies any extra `assets` into the output directory alongside your bundle.

The result is a plain directory, so CDK consumes it with `aws_lambda.Code.fromAsset`.

### Quick start

#### 1. Add the plugin to your rolldown config

```js
// rolldown.config.mjs
import { Rolldown } from 'skuba';

export default {
  input: 'src/lambda.ts',
  output: { dir: 'lib' },
  plugins: [Rolldown.lambdaAsset()],
};
```

#### 2. Bundle

```shell
skuba build
```

This assumes `skuba.build` is set to `rolldown` in your `package.json`;
otherwise, run `rolldown --config` directly.

#### 3. Point CDK at the output directory

```ts
import * as lambda from 'aws-cdk-lib/aws-lambda';

new lambda.Function(this, 'worker', {
  code: lambda.Code.fromAsset('lib'),
  handler: 'lambda.handler',
  runtime: lambda.Runtime.NODEJS_24_X,
});
```

The `handler` string is `<output file name>.<exported function name>`.
Rolldown names the entry chunk after your `input` file, so `input: 'src/lambda.ts'` with an exported `handler` gives `lambda.handler`.

Bundling and deployment stay decoupled:
your bundle is built once by your build step rather than re-run on every `cdk synth`.

### Options

| Option             | Required | Description                                                                                                                                             |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodeModules`      | No       | npm packages to install into the output directory rather than embed in the bundle. Versions are resolved from the copies installed under `projectRoot`. |
| `assets`           | No       | Extra files or directories to copy into the output directory alongside your bundle. Each `from` is resolved relative to `projectRoot`.                  |
| `projectRoot`      | No       | Directory holding the `package.json` that depends on your `nodeModules`, and the base for `assets`. Relative paths resolve against rolldown's `cwd`, which defaults to `process.cwd()`. |
| `depsLockFilePath` | No       | Path to a `pnpm-lock.yaml`. Auto-detected by walking up from rolldown's `cwd` when omitted.                                                             |

The plugin throws if your config uses `output.file` instead of `output.dir`,
or if a `nodeModules` entry cannot be resolved to an installed version.

### The generated `package.json`

The plugin always writes a `package.json` into the output directory so that Node.js interprets your chunks as ESM:

```json
{
  "type": "module"
}
```

When `nodeModules` is set, `dependencies` and your package manager pin are included too.
The pin is read from your `packageManager` field, falling back to `devEngines.packageManager`, so corepack installs with the same pnpm version as your project.

Any `package.json` you had in the output directory is overwritten, so treat the output directory as build output and keep it out of version control.

### Externals and `nodeModules`

Packages with native binaries (e.g. [`sharp`](https://sharp.pixelplumbing.com)) usually should not be bundled.
Use `nodeModules` to install them into the output directory instead, and mark them `external` in your rolldown config so they are not also embedded:

```js
// rolldown.config.mjs
import { Rolldown } from 'skuba';

export default {
  input: 'src/lambda.ts',
  output: { dir: 'lib' },
  external: [/^node:/, 'sharp'],
  plugins: [Rolldown.lambdaAsset({ nodeModules: ['sharp'] })],
};
```

Versions are read from the copy already installed under `projectRoot`, not from your `package.json` range or your lock file.
A stale `node_modules` therefore pins a stale version, so run your install before your build.

To install these packages, the plugin stages your `pnpm-workspace.yaml`, `.npmrc`, `.pnpmfile.*` files, `patches` directory and lock file into the output directory, then runs `pnpm install`.
The output directory installs a subset of your workspace's dependencies, so the staged `pnpm-workspace.yaml` sets [`allowUnusedPatches`](https://pnpm.io/settings#allowunusedpatches);
without it, pnpm fails the install on every `patchedDependencies` entry that has nothing to apply to.

Once the install is done, every staged file is deleted again.
This includes `.npmrc`, which commonly holds registry credentials and must not reach the deployed asset.
If any of them cannot be deleted, the plugin fails the build rather than leave them in the asset.

### Assets

Use `assets` to copy extra files or directories into the output directory alongside your bundle, for anything your handler reads at runtime that is not bundled (e.g. a config file or a template directory):

```js
// rolldown.config.mjs
import { Rolldown } from 'skuba';

export default {
  input: 'src/lambda.ts',
  output: { dir: 'lib' },
  plugins: [
    Rolldown.lambdaAsset({
      assets: [
        { from: 'src/config.json' },
        { from: 'src/templates', to: 'templates' },
      ],
    }),
  ],
};
```

Each `from` is resolved relative to `projectRoot`, and each `to` relative to the output directory.
`to` defaults to the basename of `from`, so `src/config.json` lands at `lib/config.json`.
Directories are copied recursively, and any parent directories in `to` are created for you.

### Workspaces

`pnpm-lock.yaml` lives at your workspace root, and that is where the plugin stages workspace config and patches from.
Dependency versions come from `projectRoot`, which is the individual package.
Building from within the package means both default correctly:

```console
$ cd packages/worker && pnpm build
```

Otherwise, set `projectRoot` to the package directory.

### Lifecycle scripts

The `nodeModules` install runs **with the full privileges of your build environment**, which typically holds cloud credentials, and the installed dependency tree may run lifecycle scripts.

Which packages may run them is governed by [`allowBuilds`](https://pnpm.io/settings#allowbuilds) in your `pnpm-workspace.yaml`, which the plugin stages for the install:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  sharp: true
```

Native modules like `sharp` need this to build, so treat your dependency tree as trusted code.

### Rebuilds

The plugin does not clean the output directory; it leaves that to rolldown.
A previous run's `node_modules` is reused, which keeps rebuilds fast.
Set [`output.cleanDir: true`](https://rolldown.rs/reference/OutputOptions.cleanDir) if you would rather trade that for a directory built from scratch every time.

The plugin removes pnpm's `node_modules` metadata after each install, as it records machine-local paths and timestamps that would otherwise change your CDK asset hash on every build.
This means each install re-links from your local pnpm store rather than short-circuiting, which costs a little time but keeps the asset reproducible.
