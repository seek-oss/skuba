import { App } from 'aws-cdk-lib';

import { globalContext } from '../shared/context-types';

import { AppStack } from './appStack';

const app = new App();

const context = globalContext.parse(app.node.tryGetContext('global'));

// eslint-disable-next-line no-new
new AppStack(app, 'appStack', {
  stackName: context.appName,
});
