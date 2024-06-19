---
'skuba': patch
---

template/\*-rest-api: Clean up templated environment variables

- `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is no longer required with AWS SDK V3.

- The `env` boilerplate in Gantry values files was largely unnecessary and confusing.

  Our templates prefer to declare configuration values directly in `src/config.ts`.
