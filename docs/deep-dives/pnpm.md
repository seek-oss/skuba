---
parent: Deep dives
---

# pnpm

---

pnpm is the recommended package manager of choice for projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** simply serves a wrapper for numerous developer tools such as TypeScript, Jest, Prettier & ESLint,
abstracting the dependency management of those packages across SEEK projects.
This means that when you are using **skuba**,
you do not need to declare these packages as direct `devDependencies`.
In our previously-recommended package manager, [Yarn], these packages and others are automatically hoisted to create a flattened dependency tree.

```json
{
  "devDependencies": {
    "skuba": "7.2.0"
  }
}
```

```
node_modules
├── jest
├── prettier
├── skuba
└── other-skuba-deps
```

However, this behaviour can lead to some [silly bugs] when updating packages.

## pnpm in skuba

[pnpm] addresses the hoisting issue by using a [symlinked structure] which allows every package to use the version range of the package they declared as opposed to the version which may have been hoisted.

This is a double-edged sword when it comes to using **skuba**,
as this means that our dependencies such as Prettier and ESLint become nested within a `node_modules/skuba/node_modules` subdirectory,
where most editor and developer tooling integrations will not know to look.

```
node_modules
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── prettier -> ../../prettier@3.0.0
    └── prettier@3.0.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

#### .npmrc

pnpm allows us to specify dependencies to hoist via command line or [`.npmrc`] file.
However, the number of package patterns we need to hoist may fluctuate,
so specifying hoist patterns via command line would be difficult to maintain.

The **skuba**-maintained `.npmrc` instructs the following dependencies to be hoisted:

```
# managed by skuba
public-hoist-pattern[]="@types*"
public-hoist-pattern[]="*eslint*"
public-hoist-pattern[]="*prettier*"
public-hoist-pattern[]="esbuild"
public-hoist-pattern[]="jest"
public-hoist-pattern[]="tsconfig-seek"
# end managed by skuba
```

From the previous example, this will produce the following `node_modules` layout which means that our integrations will now be able to find `prettier` in `node_modules/prettier` like before.

```
node_modules
├── prettier -> ./.pnpm/prettier@3.0.0
├── skuba -> ./.pnpm/skuba@7.2.0
└── .pnpm
    ├── skuba@7.2.0
    │   └── node_modules
    │       └── prettier -> ../../prettier@3.0.0
    └── prettier@3.0.0
        └── node_modules
            └── other-dep -> <store>/other-dep
```

## Migrating to pnpm from Yarn or npm

1. Install **skuba** 7.4.0 or greater

2. Install pnpm

   On macOS you can run the following:

   ```bash
   brew install pnpm
   ```

   For other operating systems you can check the [install guide].

3. Create [`pnpm-workspace.yaml`](https://pnpm.io/pnpm-workspace_yaml)

   If you are not using Yarn workspaces, you can skip this step.

   ```yaml
   packages:
     # all packages in direct subdirs of packages/
     - 'packages/*'
   ```

4. Run [`pnpm import`]

   This converts your `yarn.lock` or `package-lock.json` into a `pnpm-lock.yaml` file.

5. Delete the `yarn.lock` or `package-lock.json` file.

6. Run `skuba format`

   This will synthesise some managed hoist patterns into `.npmrc`.

7. Run `pnpm i`

// TODO Check your .npmrc buildkite/dockerfile for auth stuff

[`.npmrc`]: https://pnpm.io/npmrc
[install guide]: https://pnpm.io/installation
[pnpm]: https://pnpm.io/
[`pnpm import`]: https://pnpm.io/cli/import
[silly bugs]: https://www.kochan.io/nodejs/pnpms-strictness-helps-to-avoid-silly-bugs.html
[symlinked structure]: https://pnpm.io/symlinked-node-modules-structure
[yarn]: https://classic.yarnpkg.com/
