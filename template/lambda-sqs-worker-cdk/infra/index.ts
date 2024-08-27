import { App } from 'aws-cdk-lib';

import { AppStack } from './appStack';
import { config } from './config';

const app = new App();

// eslint-disable-next-line no-new
new AppStack(app, 'appStack', {
  stackName: config.appName,
  tags: {
    'seek:env:label': config.workerLambda.environment.ENVIRONMENT,
    'seek:source:sha': process.env.BUILDKITE_COMMIT ?? 'na',
    'seek:source:url': 'ToDo: add source URL',
    'seek:system:name': 'ToDo: add system name',
  },
});
