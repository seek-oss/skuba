import { App } from 'aws-cdk-lib';

import { AppStack } from './appStack';
import { config, environment } from './config';

const app = new App();

// eslint-disable-next-line no-new
new AppStack(app, 'appStack', {
  stackName: config.appName,
  tags: {
    'seek:env:label': environment,
    'seek:source:sha': process.env.BUILDKITE_COMMIT ?? 'na',
    // 'seek:source:url': 'TODO: add source URL',
    // 'seek:system:name': 'TODO: add system name',
  },
});
