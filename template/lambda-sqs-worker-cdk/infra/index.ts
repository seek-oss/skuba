/* eslint-disable no-new */
import { App } from '@aws-cdk/core';

import { globalContext } from '../shared/context-types';

import { AppStack } from './appStack';

const app = new App();

const context = globalContext.check(app.node.tryGetContext('global'));

new AppStack(app, 'appStack', {
  stackName: context.appName,
});
