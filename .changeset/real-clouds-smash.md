---
'skuba': minor
---

template: Remove SEEK-specific built-in templates

The following built-in templates have been removed from skuba:

- `express-rest-api`
- `koa-rest-api`
- `lambda-sqs-worker-cdk`
- `private-npm-package`

These templates are now maintained in the private [SEEK-Jobs/skuba-templates](https://github.com/SEEK-Jobs/skuba-templates) repository. SEEK employees can access them by selecting `seek →` in `skuba init`, which will present an up-to-date list of available templates.
