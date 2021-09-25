---
nav_order: 97
---

# About

---

## Goals

### Speed up prototyping and project creation

### Standardise tooling

**skuba** tracks technology recommendations from [SEEK's Technology Strategy].

### Reduce maintenance overhead

**skuba** bundles developer tooling into one `package.json#/devDependency`.

This tooling is managed and upgraded for you.
Upgrades are consolidated into one Renovate PR.

---

## Non-goals

### Support for vanilla JavaScript

TypeScript is proposed as the default language of SEEK.

**skuba** prescribes TypeScript-focused tooling.

### One stencil to rule them all

**skuba** may advocate for certain approaches and technologies through its templates,
but this shouldn't be taken as the only way you can write code.

You can continue to base codebases on your own starters and stencils.

### One library to rule them all

**skuba** distributes a minimal runtime component through the **skuba-dive** package.
It has no aspirations of becoming a monolithic Node.js runtime library.

SEEK's developer community maintains an assortment of targeted packages.

Here are some highlights:

| Package                        | Description                                            |
| :----------------------------- | :----------------------------------------------------- |
| [@seek/logger]                 | Write application logs in a standardised format        |
| [seek-datadog-custom-metrics]  | Write Datadog metrics in [Gantry] and Lambda           |
| [seek-koala]                   | Add SEEK-standard observability to Koa servers         |
| 🔒 [@seek/db-client]           | Connect to databases with credential (rotation) smarts |
| 🔒 [@seek/graphql-utils]       | Add observability to GraphQL servers                   |
| 🔒 [@seek/node-s2sauth-issuer] | Call an [s2sauth]-protected service                    |
| 🔒 [@seek/typegen]             | Generate TypeScript types from a JSON schema           |
| 🔒 [@seek/zactive-directory]   | Authenticate and authorise [SSOd] users                |

---

## Related reading

- [SEEK's Technology Strategy]
- SEEK's frontend development toolkit, [sku]

[@seek/db-client]: https://github.com/SEEK-Jobs/db-client
[@seek/graphql-utils]: https://github.com/SEEK-Jobs/graphql-utils
[@seek/logger]: https://github.com/seek-oss/logger
[@seek/node-authentication]: https://github.com/SEEK-Jobs/node-authentication
[@seek/node-s2sauth-issuer]: https://github.com/SEEK-Jobs/node-s2sauth-issuer
[@seek/typegen]: https://github.com/SEEK-Jobs/typegen
[@seek/zactive-directory]: https://github.com/SEEK-Jobs/zactive-directory
[gantry]: https://gantry.ssod.skinfra.xyz
[s2sauth]: https://github.com/SEEK-Jobs/s2sauth
[seek-datadog-custom-metrics]: https://github.com/seek-oss/datadog-custom-metrics
[seek-koala]: https://github.com/seek-oss/koala
[seek's technology strategy]: https://tech-strategy.ssod.skinfra.xyz
[sku]: https://github.com/seek-oss/sku
[ssod]: https://github.com/SEEK-Jobs/seek-ssod-ingress
