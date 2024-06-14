AAAAAAAARGHHHHH

# [![🤿 skuba](./docs/logo.svg)](https://seek-oss.github.io/skuba)

---

[![GitHub Release](https://github.com/seek-oss/skuba/workflows/Release/badge.svg?branch=main)](https://github.com/seek-oss/skuba/actions?query=workflow%3ARelease)
[![GitHub Validate](https://github.com/seek-oss/skuba/workflows/Validate/badge.svg?branch=main)](https://github.com/seek-oss/skuba/actions?query=workflow%3AValidate)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D%2018.18-brightgreen)](https://nodejs.org/en/)
[![npm package](https://img.shields.io/npm/v/skuba)](https://www.npmjs.com/package/skuba)

---

**skuba** is a toolkit for backend application and package development on SEEK's gravel and paved roads:

- Write in [TypeScript]
- Enforce coding standards with [ESLint] and [Prettier]
- Test with [Jest]
- Deploy with [Gantry], [Serverless] or the [AWS CDK]

[aws cdk]: https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html
[gantry]: https://backstage.myseek.xyz/docs/default/component/gantry/
[serverless]: https://serverless.com/

It provides you with:

- [CLI] commands for developing your project
- [Templates] to base your backend application or package on
- [Development] and optional [runtime] APIs for cross-cutting concerns

Learn more [about](docs/about.md) **skuba** and [contribute](CONTRIBUTING.md) to it.

---

**skuba** is distributed as an npm package.

In projects that list it as a `devDependency`,
usage may look something like this:

```shell
# Install project dependencies.
pnpm install

# Run the skuba CLI.
pnpm exec skuba help
```

Global installations are also supported to speed up local development:

```shell
# Install skuba globally.
pnpm add --global skuba

# Look, no `npx`!
skuba help
```

If you're new here, jump ahead to the [CLI] section to [create a new project] or [update an existing one].

[cli]: ./docs/cli
[create a new project]: ./docs/cli/init.md
[development]: ./docs/development-api
[eslint]: https://eslint.org/
[jest]: https://jestjs.io
[prettier]: https://prettier.io/
[runtime]: ./docs/runtime-api
[templates]: ./docs/templates
[typescript]: https://www.typescriptlang.org/
[update an existing one]: ./docs/cli/configure.md
