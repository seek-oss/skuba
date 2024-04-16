import { App } from 'aws-cdk-lib';

import { AppStack } from './appStack';

import { config } from './config';

const app = new App();

// eslint-disable-next-line no-new
new AppStack(app, 'appStack', {
  stackName: config.appName,
});
