---
'skuba': minor
---

format, lint: Prepend baseline SEEK `renovate-config` preset

`skuba format` and `skuba lint` will now automatically prepend an appropriate baseline preset if your project is configured with a `SEEK-Jobs` or `seekasia` remote:

```diff
// SEEK-Jobs
{
- extends: ['seek'],
+ extends: ['local>seek-jobs/renovate-config', 'seek'],
}

// seekasia
{
- extends: ['seek'],
+ extends: ['local>seekasia/renovate-config', 'seek'],
}
```

Renovate requires this new configuration to reliably access private SEEK packages. Adding the preset should fix recent issues where Renovate would open then autoclose pull requests, and report ⚠ Dependency Lookup Warnings ⚠.

See [SEEK-Jobs/renovate-config](https://github.com/SEEK-Jobs/renovate-config) and [seekasia/renovate-config](https://github.com/seekasia/renovate-config) for more information.
