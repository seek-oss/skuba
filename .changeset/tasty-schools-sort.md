---
'skuba': patch
---

template: Make all configuration values explicit

Previously, `src/config.ts` included optional configuration values and inheritance between environments in the spirit of [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself). While the templated file was wired up in a "safe" way—the production environment never inherited from other environments and explicitly specified all its configuration values—its pattern was misappropriated elsewhere and led to local configuration values affecting production environments.

Instead, we now list all configuration values explicitly against each environment.
