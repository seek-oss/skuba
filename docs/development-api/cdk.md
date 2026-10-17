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
