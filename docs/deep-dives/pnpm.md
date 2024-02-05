---
parent: Deep dives
---

# pnpm

---

pnpm is the recommended package manager of choice for projects at SEEK.

This topic details how to use pnpm with **skuba**.

---

## Background

**skuba** simply serves a wrapper for numerous developer packages such as TypeScript, Jest, Prettier & Eslint and abstracts the dependency management of those packages across all of our repos at SEEK. This means that when you are using skuba, you do not need to declare these packages as devDependencies. In our previously recommended package manager [yarn], these packages and others are hoisted to create a flattened dependency tree. However, this behaviour can lead to some [silly bugs] when updating packages.

## pnpm in skuba

[pnpm] addresses the hoisting issue by using a [symlinked structure](https://pnpm.io/symlinked-node-modules-structure) which allows every package to use the version range of the package they declared as opposed to the version which may have been hoisted.

This is a double-edged sword when it comes to using skuba, as this means that our developer dependencies such as Prettier and Eslint become nested within the skuba folder where most editor and developer tooling integrations do not know where to find it.

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

pnpm allows us to specify dependencies to hoist via command line or via a [.npmrc] file. However, the number of package patterns we need to hoist may fluctuate so specifying the hoist patterns via command line was going to be too difficult to maintain.

The skuba maintained .npmrc file looks like and instructs all the following dependencies to be hoisted.

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

From the previous example, this will produce the following node_modules layout which means that our integrations will now be able to find `prettier` in node_modules/prettier like before.

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

## Migrating to pnpm from yarn

// TODO

[.npmrc]: https://pnpm.io/npmrc
[pnpm]: https://pnpm.io/
[silly bugs]: https://www.kochan.io/nodejs/pnpms-strictness-helps-to-avoid-silly-bugs.html
[symlinked structure]: https://pnpm.io/symlinked-node-modules-structure
[yarn]: https://classic.yarnpkg.com/
