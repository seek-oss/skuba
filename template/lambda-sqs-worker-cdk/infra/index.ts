import { HookStack } from '@seek/aws-codedeploy-infra';
import { App } from 'aws-cdk-lib';

import { AppStack } from './appStack.js';
import { config } from './config.js';

const app = new App();

const appStack = new AppStack(app, 'appStack', {
  stackName: config.service,
  tags: {
    'seek:source:url': 'https://github.com/SEEK-Jobs/<%- repoName %>',
    // 'seek:system:name': 'TODO: https://rfc.skinfra.xyz/RFC051-AWS-Tagging-Standard.html#tagging-schema',
  },
});

/**
 * TODO: If deploying multiple stacks in one AWS account, deploy HookStack centrally rather than here
 * You can find the envisioned workflow here: {@link https://github.com/seek-oss/skuba/issues/1640#issuecomment-2323854827}
 */
const hookStack = new HookStack(app, 'hookStack');

// ensure that hookStack (codedeploy preTraffic) is deployed before appStack
appStack.addDependency(hookStack);

app.synth();
