import { HookStack } from '@seek/aws-codedeploy-infra';
import { App } from 'aws-cdk-lib';

import { AppStack } from './appStack';
import { config, environment } from './config';

const app = new App();

const appStack = new AppStack(app, 'appStack', {
  stackName: config.appName,
  tags: {
    'seek:env:label': environment,
    'seek:source:sha': process.env.BUILDKITE_COMMIT ?? 'na',
    // 'seek:source:url': 'TODO: add source URL',
    // 'seek:system:name': 'TODO: add system name',
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
