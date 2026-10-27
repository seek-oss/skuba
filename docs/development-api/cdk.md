---
parent: Development API
---

# Cdk

---

## normaliseTemplate

Produces stable snapshots of CDK stack templates by stripping volatile, environment-specific values.
This is particularly useful when testing to avoid snapshot churn on inconsequential differences in the generated templates.

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Cdk } from 'skuba';

test('stack', () => {
  // ...

  const template = Template.fromStack(stack);

  const json = Cdk.normaliseTemplate(template.toJSON());

  expect(json).toMatchSnapshot();
});
```

---

## ensureAssetPlaceholders

Creates placeholder Lambda asset directories (each containing a stub `index.js` handler) when they do not already exist.
CDK synthesis requires directories referenced by `Code.fromAsset` to exist, so this lets stack tests run without first building the real bundles.
Existing directories are left untouched.

Relative paths are resolved against the `cwd` option, which defaults to `process.cwd()`.

```typescript
import { Cdk } from 'skuba';

beforeAll(() => {
  Cdk.ensureAssetPlaceholders(['dist/worker'], {
    cwd: path.join(import.meta.dirname, '..'),
  });
});
```
