---
'skuba': minor
---

format, lint: Patch `src/listen.ts` entry points to handle `unhandledRejection`s

A [Promise](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs) that is not awaited and later moves to a rejected state is referred to as an unhandled rejection. When an unhandled rejection is encountered, a Node.js application that does not use process clustering will default to crashing out.

This patch adds a [`process.on('unhandledRejection')`](https://nodejs.org/api/process.html#event-unhandledrejection) listener to `src/listen.ts` server entry points to log rather than crash on such rejections. If your application uses a different entry point, consider adding code similar to the following sample to improve resilience:

```typescript
// If you want to gracefully handle this scenario in AWS Lambda,
// remove the default AWS Lambda listener which throws an error.
// process.removeAllListeners('unhandledRejection');

// Report unhandled rejections instead of crashing the process
// Make sure to monitor these reports and alert as appropriate
process.on('unhandledRejection', (err) =>
  logger.error(err, 'Unhandled promise rejection'),
);
```
