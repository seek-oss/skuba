import * as fs from 'node:fs';
import * as path from 'node:path';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

import { Bundling } from './bundling.js';
import { ValidationError } from './errors.js';
import { PNPM_LOCK } from './package-manager.js';
import type { BundlingOptions } from './types.js';
import { findUp } from './util.js';

export interface NodejsFunctionProps extends lambda.FunctionOptions {
  readonly entry: string;

  readonly handler?: string;

  readonly runtime?: lambda.Runtime;

  readonly depsLockFilePath?: string;

  readonly projectRoot?: string;

  readonly bundling: BundlingOptions;
}

export class NodejsFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props: NodejsFunctionProps) {
    if (props.runtime && props.runtime.family !== lambda.RuntimeFamily.NODEJS) {
      throw new ValidationError('Only NODEJS runtimes are supported.');
    }

    const runtime = props.runtime ?? lambda.Runtime.NODEJS_LATEST;

    const entry = validateEntry(props.entry);
    const depsLockFilePath = findLockFile(props.depsLockFilePath);
    const projectRoot = path.resolve(
      props.projectRoot ?? path.dirname(depsLockFilePath),
    );
    const bundlerConfig = path.resolve(
      projectRoot,
      props.bundling.bundlerConfig,
    );

    const handlerFn = resolveHandlerFn(props.handler);

    const {
      entry: _entry,
      bundling,
      depsLockFilePath: _depsLockFilePath,
      projectRoot: _projectRoot,
      handler: _handler,
      runtime: _runtime,
      ...functionOptions
    } = props;

    super(scope, id, {
      ...functionOptions,
      runtime,
      code: Bundling.bundle({
        ...bundling,
        bundlerConfig,
        entry,
        depsLockFilePath,
        projectRoot,
      }),
      handler: `index.${handlerFn}`,
    });
  }
}

const resolveHandlerFn = (handler?: string): string => {
  const handlerName = (handler ?? 'handler').trim();
  const handlerFn = handlerName.slice(handlerName.lastIndexOf('.') + 1);
  if (!/^[A-Za-z_$][\w$]*$/.test(handlerFn)) {
    throw new ValidationError(
      `Invalid handler '${handler}'. Expected an exported function name, optionally prefixed with a file part (e.g. 'handler' or 'index.handler').`,
    );
  }
  return handlerFn;
};

const validateEntry = (entry: string): string => {
  const base = path.basename(entry);
  if (
    /\.d\.(c|m)?ts$/i.test(base) ||
    !/\.(js|ts|mjs|mts|cts|cjs)$/i.test(base)
  ) {
    throw new ValidationError(
      'Only JavaScript or TypeScript entry files are supported.',
    );
  }

  const resolved = path.resolve(entry);
  if (!fs.existsSync(resolved)) {
    throw new ValidationError(`Cannot find the entry file at '${entry}'.`);
  }
  return resolved;
};

const findLockFile = (depsLockFilePath?: string): string => {
  if (depsLockFilePath) {
    const resolved = path.resolve(depsLockFilePath);
    if (!fs.existsSync(resolved)) {
      throw new ValidationError(
        `Cannot find a pnpm-lock.yaml file at '${depsLockFilePath}'.`,
      );
    }
    return resolved;
  }

  const lockFile = findUp(PNPM_LOCK);
  if (!lockFile) {
    throw new ValidationError(
      'Cannot find a pnpm-lock.yaml file. Please specify it with `depsLockFilePath`.',
    );
  }

  return lockFile;
};
