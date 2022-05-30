---
'skuba': minor
---

deps: TypeScript 4.7

This major release includes breaking changes. See the [TypeScript 4.7](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/) announcement for more information.

While ECMAScript Module support for Node.js is now stable in TypeScript, other aspects of our toolchain have not caught up yet; notably, Node.js still lacks stable APIs for Jest to implement its usual suite of mocking capabilities. We are holding off on recommending existing repositories to make the switch and on providing reference implementations via our templates. As it stands, migrating from CJS to ESM is still an arduous exercise in rewriting import statements and restructuring mocks and test suites at the bare minimum.
