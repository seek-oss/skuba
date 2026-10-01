---
'skuba': minor
---

lint: Bind `agentFromApp` SuperTest servers to `127.0.0.1` to fix intermittent 404s in tests

SuperTest binds its server to `::` but sends requests to `127.0.0.1`. On macOS, this can land on a port another program (e.g. Cursor, Postman) already holds on `127.0.0.1`, which then answers with a 404 instead of your app.
