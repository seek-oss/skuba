---
'skuba': minor
---

format/lint: Switch distroless image from nodejs to nodejs-debian11

skuba format and skuba lint will now automatically switch your gcr.io/distroless/nodejs:18 image to gcr.io/distroless/nodejs18-debian11. This is now the [recommended](https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md) base image for Node.js.
