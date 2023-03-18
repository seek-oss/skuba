---
'skuba': patch
---

format, lint, template/\*-rest-api: Set `keepAliveTimeout` to 31 seconds to prevent HTTP 502s

The default Node.js server keep-alive timeout is set to 5 seconds. However, the Gantry default ALB idle timeout is 30 seconds. This would lead to the occasional issues where the sidecar would throw `proxyStatus=502` errors. AWS recommends setting an application timeout larger than the ALB idle timeout.

`skuba format` and `skuba lint` will now automatically append a keep-alive timeout to a typical `src/listen.ts`:

```diff
// With a listener callback
const listener = app.listen(config.port, () => {
  const address = listener.address();
})
+
+ listener.keepAliveTimeout = 31000;

// Without a listener callback
- app.listen(config.port);
+ const listener = app.listen(config.port);
+
+ listener.keepAliveTimeout = 31000;
```

A more detailed explanation can be found in the below links:

1. <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout>
2. <https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout>
