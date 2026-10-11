---
'skuba': patch
---

lint: Allow `skuba.template.js` in template repositories

The `no-skuba-template-js` internal lint now distinguishes source template repositories from generated projects using the `package.json#skuba` metadata written by `skuba init`.
