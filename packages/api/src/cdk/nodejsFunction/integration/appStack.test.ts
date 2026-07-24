import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, Duration, Stack, type StackProps, aws_lambda } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import type { Construct } from 'constructs';
import { afterEach, expect, it, vi } from 'vitest';

import { normaliseTemplate } from '../../normaliseTemplate/index.js';
import { NodejsFunction } from '../function.js';

afterEach(() => {
  vi.resetModules();
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '../../../..');
const REPO_ROOT = path.resolve(API_ROOT, '../..');
const FIXTURES = path.join(HERE, 'fixtures');

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new NodejsFunction(this, 'worker', {
      runtime: aws_lambda.Runtime.NODEJS_24_X,
      architecture: aws_lambda.Architecture.ARM_64,
      memorySize: 512,
      entry: path.join(FIXTURES, 'handler.ts'),
      depsLockFilePath: path.join(REPO_ROOT, 'pnpm-lock.yaml'),
      projectRoot: FIXTURES,
      timeout: Duration.seconds(30),
      bundling: {
        bundlerConfig: path.join(FIXTURES, 'rolldown', 'config.mjs'),
      },
      environment: {
        NODE_ENV: 'production',
      },
    });
  }
}

it('synthesises expected CloudFormation template', () => {
  const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
  const stack = new AppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  const json = normaliseTemplate(template.toJSON());

  expect(json).toMatchSnapshot();
});
