import { App, aws_secretsmanager, aws_sns } from 'aws-cdk-lib';
import { Cdk } from 'skuba';
import { Template } from 'aws-cdk-lib/assertions';
import { afterAll, afterEach, expect, it, vi } from 'vitest';

const originalDeployment = process.env.DEPLOYMENT;
const originalVersion = process.env.VERSION;

afterAll(() => {
  process.env.DEPLOYMENT = originalDeployment;
  process.env.VERSION = originalVersion;
});

afterEach(() => {
  vi.resetModules();
});

it.each(['dev', 'prod'])(
  'returns expected CloudFormation stack for %s',
  async (deployment) => {
    process.env.DEPLOYMENT = deployment;
    process.env.VERSION = 'local';

    const { AppStack } = await import('./appStack.js');

    vi.spyOn(aws_sns.Topic, 'fromTopicArn').mockImplementation(
      (scope, id) => new aws_sns.Topic(scope, id),
    );

    vi.spyOn(
      aws_secretsmanager.Secret,
      'fromSecretPartialArn',
    ).mockImplementation(
      (scope, id) => new aws_secretsmanager.Secret(scope, id),
    );

    const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });

    const stack = new AppStack(app, 'appStack');

    const template = Template.fromStack(stack);

    const json = Cdk.normaliseTemplate(template.toJSON());

    expect(json).toMatchSnapshot();
  },
);
