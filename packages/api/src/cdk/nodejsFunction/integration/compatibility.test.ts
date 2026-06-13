import type {
  aws_lambda_event_sources,
  aws_lambda_nodejs,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { describe, expectTypeOf, it } from 'vitest';

import type { NodejsFunction, NodejsFunctionProps } from '../function.js';

describe('NodejsFunction type compatibility', () => {
  it('is usable wherever a CDK NodejsFunction is expected', () => {
    expectTypeOf<NodejsFunction>().toExtend<aws_lambda_nodejs.NodejsFunction>();
  });

  it('is assignable to lambda.Function', () => {
    expectTypeOf<NodejsFunction>().toExtend<lambda.Function>();
  });

  it('is assignable to lambda.IFunction', () => {
    expectTypeOf<NodejsFunction>().toExtend<lambda.IFunction>();
  });

  it('satisfies SqsEventSource addEventSource parameter', () => {
    type AddEventSourceArg = Parameters<
      InstanceType<typeof aws_lambda_event_sources.SqsEventSource>['bind']
    >[0];
    expectTypeOf<NodejsFunction>().toExtend<AddEventSourceArg>();
  });

  it('accepts our props wherever CDK NodejsFunctionProps is expected', () => {
    expectTypeOf<NodejsFunctionProps>().toExtend<aws_lambda_nodejs.NodejsFunctionProps>();
  });

  it('intentionally diverges: a CDK NodejsFunctionProps is not valid input (bundling required, different BundlingOptions)', () => {
    expectTypeOf<aws_lambda_nodejs.NodejsFunctionProps>().not.toExtend<NodejsFunctionProps>();
  });
});
