---
nav_order: 1
---

# 🤿

---

```text
    ╭─╮     ╭─╮
╭───│ ╰─╭─┬─╮ ╰─╮───╮
│_ ─┤  <│ ╵ │ • │ • │
╰───╰─┴─╰───╯───╯── ╰
```

[![GitHub Release](https://github.com/seek-oss/skuba/workflows/Release/badge.svg?branch=master)](https://github.com/seek-oss/skuba/actions?query=workflow%3ARelease)
[![GitHub Validate](https://github.com/seek-oss/skuba/workflows/Validate/badge.svg?branch=master)](https://github.com/seek-oss/skuba/actions?query=workflow%3AValidate)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D%2012-brightgreen)](https://nodejs.org/en/)
[![npm package](https://img.shields.io/npm/v/skuba)](https://www.npmjs.com/package/skuba)

---

**skuba** is a toolkit for backend application and package development on SEEK's gravel and paved roads:

- Write in TypeScript
- Enforce coding standards with ESLint and Prettier
- Test with Jest
- Deploy with [Gantry], [Serverless] or the [AWS CDK]

[aws cdk]: https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html
[gantry]: https://gantry.ssod.skinfra.xyz
[serverless]: https://serverless.com/

It provides you with:

- Commands for developing your project
- Templates to base your backend application or package on

---

## Getting started

Create a new project:

```shell
npx skuba init
```

Or bootstrap an existing project:

```shell
npx skuba configure
```

Global installations are supported to speed up local development:

```shell
yarn global add skuba

# Look, no `npx`!
skuba version
```

---

## Next steps

View the CLI and API references:

- [CLI](docs/cli)
- [Development API](docs/development-api)
- [Runtime API](docs/runtime-api)

You can also learn more [about](docs/about.md) **skuba** and [contribute](CONTRIBUTING.md) to it.
