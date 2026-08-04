---
'skuba': minor
---

Rolldown: Add `Rolldown.lambdaAsset` plugin

A new rolldown plugin that prepares a bundle output directory for deployment as a Lambda function, so CDK can pick it up with a plain `aws_lambda.Code.fromAsset`.

```js
// rolldown.config.mjs
import { Rolldown } from 'skuba';

export default {
  input: 'src/lambda.ts',
  output: { dir: 'lib' },
  external: ['sharp'],
  plugins: [Rolldown.lambdaAsset({ nodeModules: ['sharp'] })],
};
```

The plugin writes an ESM `package.json`, and installs any `nodeModules` into the output directory with pnpm, copying across your workspace config and patches. Install-only files, including `.npmrc`, are stripped from the output afterwards. It can also copy extra `assets` into the output directory alongside your bundle.

It supports ESM output and pnpm only. It leaves the rest of your rolldown config alone, and does not wrap CDK.
