---
'skuba': minor
---

Rolldown: Add `Rolldown.lambdaAsset` plugin

A new rolldown plugin that prepares a bundle output directory for deployment as a Lambda function, so CDK can pick it up with a plain `aws_lambda.Code.fromAsset`.

```ts
// rolldown.config.ts
import { defineConfig } from 'rolldown';
import { Rolldown } from 'skuba';

export default defineConfig({
  input: 'src/lambda.ts',
  output: { dir: 'lib' },
  external: ['sharp'],
  plugins: [Rolldown.lambdaAsset({ nodeModules: ['sharp'] })],
});
```

The plugin writes an ESM `package.json`, and installs any `nodeModules` into the output directory with pnpm, copying across your workspace config and patches. The generated `package.json` forwards your package manager pin, read from `packageManager` or `devEngines.packageManager`, so the install runs on the same pnpm version as your project. Install-only files, including `.npmrc`, are stripped from the output afterwards. It can also copy extra `assets` into the output directory alongside your bundle.

It supports ESM output and pnpm only. It leaves the rest of your rolldown config alone, and does not wrap CDK.

`skuba build` also forwards a `--config`/`-c` flag through to rolldown, so a package can ship multiple bundles from separate config files, e.g. `skuba build --config rolldown.worker1.config.ts`.
