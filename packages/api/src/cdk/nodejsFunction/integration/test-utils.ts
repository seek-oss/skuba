import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as aws_lambda from 'aws-cdk-lib/aws-lambda';

import { BRIDGE_RELATIVE_PATH } from '../bridge-path.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const API_ROOT = path.resolve(HERE, '../../../..');

export const REPO_ROOT = path.resolve(API_ROOT, '../..');

export const FIXTURES = path.join(HERE, 'fixtures');

export const BRIDGE_PATH = path.join(API_ROOT, BRIDGE_RELATIVE_PATH);

export const BRIDGE_BUILT = existsSync(BRIDGE_PATH);

export const BASE_BUNDLING_PROPS = {
  runtime: aws_lambda.Runtime.NODEJS_24_X,
  architecture: aws_lambda.Architecture.ARM_64,
  depsLockFilePath: path.join(REPO_ROOT, 'pnpm-lock.yaml'),
  projectRoot: FIXTURES,
};
