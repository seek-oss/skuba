---
parent: CLI
nav_order: 3
---

# Run code

---

**skuba** lets you interactively run your TypeScript source code during development.
The following commands are powered by [`ts-node`] and [`ts-node-dev`].

---

## skuba node

Runs a TypeScript source file, or opens a REPL if none is provided:

- `skuba node src/some-cli-script.ts`
- `skuba node`

`skuba node` automatically registers a `src` module alias for ease of local development.
If you use this alias in your production code,
your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory.
import 'skuba-dive/register';

// You can use the `src` module alias after registration.
import { rootLogger } 'src/framework/logging';
```

---

## skuba start

Starts a live-reloading server for local development.

The entry point is chosen from:

1. Command line argument: `skuba start src/app.ts`
1. Manifest configuration: `package.json#/skuba/entryPoint`
1. Default: `src/app.ts`

The `--inspect` and `--inspect-brk` [Node.js options] are supported for debugging sessions.
For example, in Visual Studio Code:

1. Run `skuba start --inspect-brk`
1. Run the built-in `Node.js: Attach` launch configuration

`skuba start` automatically registers a `src` module alias for ease of local development.
If you use this alias in your production code,
your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory.
import 'skuba-dive/register';

// You can use the `src` module alias after registration.
import { rootLogger } 'src/framework/logging';
```

### Start an executable script

Your entry point can be a simple module that runs on load:

```typescript
console.log('Hello world!');
```

### Start a Lambda function handler

Your entry point can target an exported function:

```shell
skuba start --port 12345 src/app.ts#handler
```

```typescript
export const handler = async (event: unknown, ctx: unknown) => {
  // ...

  return;
};
```

This starts up a local HTTP server that you can POST arguments to:

```shell
curl --data '["event", {"awsRequestId": "123"}]' --include localhost:12345
```

### Start an HTTP server

Your entry point should export:

```typescript
interface Export {
  // One of these is required.
  callback?: () => http.RequestListener;
  requestListener?: http.RequestListener;

  // Optional; falls back to an available port.
  port?: number;
}
```

[Koa] should work with minimal fuss:

```typescript
const app = new Koa();

// You can also use `export =` syntax as required by koa-cluster.
export default Object.assign(app, { port });
```

As should [Express]:

```typescript
const app = express();

export default Object.assign(app, { port });
```

[`skuba-dive/register`]: https://github.com/seek-oss/skuba-dive#register
[`ts-node-dev`]: https://github.com/whitecolor/ts-node-dev
[`ts-node`]: https://github.com/typestrong/ts-node
[express]: https://expressjs.com/
[koa]: https://koajs.com/
[node.js options]: https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options
