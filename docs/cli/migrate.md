---
parent: CLI
nav_order: 7
---

# Migrate

---

## skuba migrate help

Echoes the available **skuba** migrations.

```shell
skuba migrate help
```

---

## skuba migrate node

**skuba** includes migrations to upgrade your project to the [active LTS version] of Node.js.
This is intended to minimise effort required to keep up with annual Node.js releases.

The following files are scanned:

- `.node-version`
- `.nvmrc`
- `package.json`s
- `tsconfig.json`s
- Buildkite pipelines in `.buildkite/` directories
- CDK files in `infra/` directories
- Dockerfiles & Docker Compose files
- Serverless files

**skuba** may not be able to upgrade all projects,
and typically works best when a project closely matches a built-in [template].
Check your project for files that may have been missed,
review and test the modified code as appropriate before releasing to production,
and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.
Exercise particular caution with monorepos,
as some may have employed unique configurations that the migration has not accounted for.

The migration will attempt to proceed if your project:

- Specifies a Node.js version in `.node-version`, `.nvmrc`, and/or `package.json#/engines/node`

- Does not include a `package.json#/files` field

  This field implies that your project is an npm package.
  See below for considerations when manually upgrading npm packages.

- Specifies a project type in `package.json#/skuba/type` that is not `package`

  Well-known project types currently include `application` and `package`.
  While we intend to improve support for monorepo projects in a future version,
  you may enable migrations in the interim by setting your root `/package.json` project type to `root`.

**skuba** upgrades your `tsconfig.json`s in line with the official [Node Target Mapping] guidance.
`tsconfig.json`s contain two options that are linked to Node.js versions:

- `lib` configures the language features available to your source code.

  For example, including `ES2024` allows you to use the [`Object.groupBy()` static method].
  The features available in each new ECMAScript version are summarised on [node.green](https://node.green/).

- `target` configures the transpilation behaviour of the TypeScript compiler.

  Back-end applications typically synchronise `lib` with their Node.js runtime.
  In this scenario, there is no need to transpile language features and `target` can match the ECMAScript version in `lib`.

  On the other hand, you may wish to use recent language features when authoring your npm packages while retaining support for package consumers on older Node.js runtimes.
  In this scenario, see the note below on transpilation for npm packages.

As of **skuba** 14, for npm packages, we will attempt to upgrade your targets to be 2 major versions behind the current LTS Node.js version.

For example, when upgrading a project to Node.js 24, we will upgrade npm packages to target Node.js 20.

To ensure accurate detection of npm packages, set the `skuba.type` field in your `package.json` to `package` for npm packages and `application` for applications.

The following fields are modified for npm packages:

- `package.json#/engines/node`

  The `engines` property propagates to your package consumers.
  For example, if you specify a minimum Node.js version of 22,
  it will prevent your package from being installed in a Node.js 20 environment:

  ```json
  {
    "engines": {
      "node": ">=22"
    }
  }
  ```

  Take care with the `engines` property of an npm package;
  modifications typically necessitate a new major release per [semantic versioning].

- `tsconfig.json#/target`

  Refer to the official [Node Target Mapping] guidance and ensure that the transpilation target corresponds to the minimum Node.js version in `engines`.

  For monorepo projects,
  check whether your npm packages inherit from another `tsconfig.json`.
  You may need to define explicit overrides for npm packages like so:

  ```diff
    {
  +   "compilerOptions": {
  +     "removeComments": false,
  +     "target": "ES2023" // Continue to support package consumers on Node.js 20
  +   },
      "extends": "../../tsconfig.json"
    }
  ```

`skuba format` and `skuba lint` will automatically run these migrations as [patches].

As of **skuba** 14,

- `skuba migrate node24` will attempt to update underlying infrastructure packages to versions that support Node.js 24. These include `aws-cdk-lib`, `datadog-cdk-constructs-v2`, `osls`, `serverless`, `serverless-plugin-datadog` and `@types/node`.

[`Object.groupBy()` static method]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
[active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases
[Node Target Mapping]: https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping
[patches]: ./lint.md#patches
[semantic versioning]: https://semver.org/
[template]: ../templates/index.md

### skuba migrate node24

Attempts to automatically upgrade your project to Node.js 24 and your package targets to Node.js 20.

```shell
skuba migrate node24
```

Node.js 24 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-24]
- The AWS [release announcement][aws-24] for the Lambda `nodejs24.x` runtime update

[aws-24]: https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/
[node-24]: https://nodejs.org/en/blog/release/v24.0.0

### skuba migrate node22

Attempts to automatically upgrade your project to Node.js 22.

```shell
skuba migrate node22
```

Node.js 22 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-22]
- The AWS [release announcement][aws-22] for the Lambda `nodejs22.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs22.x`,
and `@types/node` to major version `22`.

[aws-22]: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
[node-22]: https://nodejs.org/en/blog/announcements/v22-release-announce

### skuba migrate node20

Attempts to automatically upgrade your project to Node.js 20.

```shell
skuba migrate node20
```

Node.js 20 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-20]
- The AWS [release announcement][aws-20] for the Lambda `nodejs20.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs20.x`,
and `@types/node` to major version `20`.

[aws-20]: https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/
[node-20]: https://nodejs.org/en/blog/announcements/v20-release-announce
