import { Tags } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

const tags: Record<string, string> = {
  'seek:env:label': process.env.ENVIRONMENT ?? '',
  'seek:source:sha': process.env.BUILDKITE_COMMIT ?? '',
  'seek:source:url': 'ToDo: add source URL',
  'seek:system:name': 'ToDo: add system name',
};

export const applyTags = (construct: Construct) => {
  Object.entries(tags).forEach(([key, value]) => {
    Tags.of(construct).add(key, value);
  });
};
