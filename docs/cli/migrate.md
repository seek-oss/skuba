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

**skuba** may not be able to upgrade all projects;
Check your project for files that may have been missed,
review and test the modified code as appropriate before releasing to production,
and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

As of **skuba** 10,
`skuba format` and `skuba lint` will automatically run these migrations as [patches].

[active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases
[patches]: ./lint.md#patches

### skuba migrate node22

Attempts to automatically upgrade your project to Node.js 22.

```shell
skuba migrate node22
```

Node.js 22 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-22]
- The AWS [release announcement][aws-22] for the Lambda `nodejs22.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs22.x`.

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

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs20.x`.

[aws-20]: https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/
[node-20]: https://nodejs.org/en/blog/announcements/v20-release-announce
