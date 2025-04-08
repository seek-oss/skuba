---
'skuba': minor
---

lint: Remove cdk.context.json from **skuba**'s managed `.gitignore`

AWS CDK generates a `cdk.context.json` file when running commands like `cdk synth` or `cdk deploy`. This file is [recommended to be included in source control](https://docs.aws.amazon.com/cdk/v2/guide/context.html#context_construct).

If this change is incompatible with your project's setup, manually add `cdk.context.json` back to your `.gitignore` file, outside of the **skuba** managed section.
