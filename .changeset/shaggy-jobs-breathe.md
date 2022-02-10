---
"skuba": major
---

template: Use `--enable-source-maps`

Stable source map support has landed in Node.js 14.18+ via the built-in `--enable-source-maps` option.

We recommend migrating off of custom source map implementations in favour of this option. Upgrading to [**skuba-dive** v2](https://github.com/seek-oss/skuba-dive/releases/tag/v2.0.0) will remove `source-map-support` from the `skuba-dive/register` hook.

For a containerised application, update your Dockerfile:

```diff
- FROM gcr.io/distroless/nodejs:12 AS runtime
+ FROM gcr.io/distroless/nodejs:16 AS runtime

+ # https://nodejs.org/api/cli.html#cli_node_options_options
+ ENV NODE_OPTIONS --enable-source-maps
```

For a Serverless Lambda application, update your `serverless.yml`:

```diff
provider:
- runtime: nodejs12.x
+ runtime: nodejs14.x

functions:
  Worker:
    environment:
+     # https://nodejs.org/api/cli.html#cli_node_options_options
+     NODE_OPTIONS: --enable-source-maps
```

For a CDK Lambda application, update your stack:

```diff
new aws_lambda.Function(this, 'worker', {
- runtime: aws_lambda.Runtime.NODEJS_12_X,
+ runtime: aws_lambda.Runtime.NODEJS_14_X,
  environment: {
+   // https://nodejs.org/api/cli.html#cli_node_options_options
+   NODE_OPTIONS: '--enable-source-maps',
  },
});
```
