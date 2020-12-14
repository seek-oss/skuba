---
'skuba': minor
---

**node, start:** Support function entry points

You can now specify an entry point that targets an exported function:

```bash
skuba start --port 12345 src/app.ts#handler
```

This starts up a local HTTP server that you can POST arguments to:

```bash
curl --data '["event", {"awsRequestId": "123"}]' --include localhost:12345
```

You may find this useful to run Lambda function handlers locally.
