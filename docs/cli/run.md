---
parent: CLI
nav_order: 3
---

# Run code

---

**skuba** lets you interactively run your TypeScript source code during development, powered by [`tsx`].

These commands are only intended to serve local development and simple scripting scenarios,
as a TypeScript process can present substantial overhead at runtime.
In production, we recommend [`skuba build`]ing your project and executing under a regular Node.js runtime.

---

## skuba node

Runs a TypeScript source file:

```shell
skuba node src/some-cli-script.ts

# ...
```

or launches a [`tsx`] REPL if a file is not provided:

```shell
skuba node src/some-cli-script.ts

>
```

`skuba node` automatically registers your `tsconfig.json` paths as module aliases for ease of local development.
If you use these aliases in your production code,
your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`] or [`tsconfig-paths`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory.
import 'skuba-dive/register';

// You can use the `src` module alias after registration.
import { logger } 'src/framework/logging';
```

---

## skuba start

Starts a live-reloading server for local development.

```shell
skuba start src/app.ts
```

The entry point is chosen from:

1. Command line argument: `skuba start src/app.ts`
1. Manifest configuration: `package.json#/skuba/entryPoint`
1. Default: `src/app.ts`

`skuba start` automatically registers your `tsconfig.json` paths as module aliases for ease of local development.
If you use these aliases in your production code,
your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`] or [`tsconfig-paths`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory.
import 'skuba-dive/register';

// You can use the `src` module alias after registration.
import { logger } 'src/framework/logging';
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
  server?: http.Server;

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

As should [Fastify]:

```typescript
const createApp = async () => {
  const app = fastify();
  await app.ready();
  return app;
};
const app = createApp();

export default app;
```

As should [Express]:

```typescript
const app = express();

export default Object.assign(app, { port });
```

As should a [HTTP Server]:

```typescript
const app = http.createServer();

export default Object.assign(app, { port });
```

### Debugging options

The `--inspect` and `--inspect-brk` [Node.js options] are supported for debugging sessions.

#### Automatically attaching a debugger

The simplest way to attach a debugger to VS Code is to use its built-in debug terminal.

1. Hit `⌘ + ⇧ + P` to bring up the Command Palette.
2. Select `Debug: JavaScript Debug Terminal`
3. Run any command within the terminal; for example, `skuba test`, `skuba start` and VS Code will automatically attach to it.

#### Manually attaching a debugger

Try this out by starting your project with inspector enabled:

```bash
pnpm start:debug
```

Next, attach VS Code's debugger to the running process:

1. Hit `⌘ + ⇧ + P` to bring up the Command Palette.
2. Select `Debug: Attach to Node Process`
3. Select the `node` process that is pointing to `pnpm start:debug`

```shell
Pick the node.js process to attach to

...

node /Users/seeker/.nvm/versions/node/vX.Y.Z/bin/pnpm start --inspect-brk
process id: 1000 (SIGUSR1)
```

If all goes well, the Status Bar will turn orange.
We can progress past the initial breakpoint by pressing the `▶️` button,
then test out a custom breakpoint.

For example, you could set one in your health check handler if you're working on an API:

```typescript
// src/api/healthCheck.ts

🔴 6  ctx.body = '';
```

Then try cURLing your health check endpoint:

```bash
curl --include localhost:<port>/health
```

Execution should pause on the breakpoint until we hit `F5` or the `▶️` button.

[`skuba build`]: ./build.md
[`skuba-dive/register`]: https://github.com/seek-oss/skuba-dive#register
[`tsconfig-paths`]: https://github.com/dividab/tsconfig-paths
[`tsx`]: https://github.com/privatenumber/tsx
[express]: https://expressjs.com/
[fastify]: https://www.fastify.io/
[http server]: https://nodejs.org/docs/latest-v20.x/api/http.html#class-httpserver
[koa]: https://koajs.com/
[node.js options]: https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options
