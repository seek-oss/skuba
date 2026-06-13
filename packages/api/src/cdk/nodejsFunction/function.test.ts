import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from './errors.js';
import { NodejsFunction } from './function.js';
import * as utilModule from './util.js';

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: vi.fn<typeof original.spawnSync>().mockReturnValue({
      status: 0,
      error: undefined,
      pid: 1,
      output: [],
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      signal: null,
    }),
  };
});

let tmpDir: string;
let entryFile: string;
let lockFile: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fn-test-'));
  entryFile = path.join(tmpDir, 'handler.ts');
  lockFile = path.join(tmpDir, 'pnpm-lock.yaml');
  fs.writeFileSync(entryFile, 'export const handler = () => {};');
  fs.writeFileSync(lockFile, '');
  fs.writeFileSync(path.join(tmpDir, 'build.mjs'), 'export default {};');
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'test', dependencies: {} }),
  );
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const makeApp = () => new App({ context: { 'aws:cdk:bundling-stacks': [] } });

const makeScope = () => new Stack(makeApp(), 'TestStack');

describe('NodejsFunction', () => {
  it('synthesises a Lambda function with correct defaults', () => {
    const scope = makeScope();
    new NodejsFunction(scope, 'my-handler', {
      entry: entryFile,
      depsLockFilePath: lockFile,
      bundling: {
        bundlerConfig: path.join(tmpDir, 'build.mjs'),
      },
    });

    const template = Template.fromStack(scope);
    expect(() =>
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: lambda.Runtime.NODEJS_LATEST.name,
      }),
    ).not.toThrow();
  });

  it('uses provided runtime', () => {
    const scope = makeScope();
    new NodejsFunction(scope, 'my-handler', {
      entry: entryFile,
      runtime: lambda.Runtime.NODEJS_24_X,
      depsLockFilePath: lockFile,
      bundling: {
        bundlerConfig: path.join(tmpDir, 'build.mjs'),
      },
    });

    expect(() =>
      Template.fromStack(scope).hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs24.x',
      }),
    ).not.toThrow();
  });

  it('re-anchors a dotted handler to index. since output is always index.js', () => {
    const scope = makeScope();
    new NodejsFunction(scope, 'my-handler', {
      entry: entryFile,
      handler: 'myFile.myFunction',
      depsLockFilePath: lockFile,
      bundling: {
        bundlerConfig: path.join(tmpDir, 'build.mjs'),
      },
    });

    expect(() =>
      Template.fromStack(scope).hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.myFunction',
      }),
    ).not.toThrow();
  });

  it('keeps only the final segment of a multi-dot / path-prefixed handler', () => {
    const scope = makeScope();
    new NodejsFunction(scope, 'my-handler', {
      entry: entryFile,
      handler: 'src/nested.module.run',
      depsLockFilePath: lockFile,
      bundling: {
        bundlerConfig: path.join(tmpDir, 'build.mjs'),
      },
    });

    expect(() =>
      Template.fromStack(scope).hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.run',
      }),
    ).not.toThrow();
  });

  it.each(['', '   ', 'handler.', 'my-fn', '2fn', 'a.b.'])(
    'throws ValidationError for malformed handler %p',
    (handler) => {
      const scope = makeScope();
      expect(
        () =>
          new NodejsFunction(scope, 'my-handler', {
            entry: entryFile,
            handler,
            depsLockFilePath: lockFile,
            bundling: {
              bundlerConfig: path.join(tmpDir, 'build.mjs'),
            },
          }),
      ).toThrow(ValidationError);
    },
  );

  it('prefixes handler with index. when no dot present', () => {
    const scope = makeScope();
    new NodejsFunction(scope, 'my-handler', {
      entry: entryFile,
      handler: 'myFunction',
      depsLockFilePath: lockFile,
      bundling: {
        bundlerConfig: path.join(tmpDir, 'build.mjs'),
      },
    });

    expect(() =>
      Template.fromStack(scope).hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.myFunction',
      }),
    ).not.toThrow();
  });

  it('resolves a relative bundlerConfig against the projectRoot', () => {
    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          depsLockFilePath: lockFile,
          projectRoot: tmpDir,
          bundling: {
            bundlerConfig: 'build.mjs',
          },
        }),
    ).not.toThrow();
  });

  it('throws ValidationError for non-NODEJS runtime', () => {
    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          runtime: lambda.Runtime.PYTHON_3_12,
          depsLockFilePath: lockFile,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).toThrow(ValidationError);
  });

  it('uses explicit projectRoot', () => {
    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          depsLockFilePath: lockFile,
          projectRoot: tmpDir,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).not.toThrow();
  });

  it('throws when entry file has unsupported extension', () => {
    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: path.join(tmpDir, 'handler.py'),
          depsLockFilePath: lockFile,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).toThrow(ValidationError);
  });

  it('accepts an entry with an uppercase extension', () => {
    const upperEntry = path.join(tmpDir, 'upper.TS');
    fs.writeFileSync(upperEntry, 'export const handler = () => {};');

    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: upperEntry,
          depsLockFilePath: lockFile,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).not.toThrow();
  });

  it.each(['types.d.ts', 'types.d.mts', 'types.d.cts'])(
    'throws ValidationError for declaration file entry %p',
    (name) => {
      const scope = makeScope();
      expect(
        () =>
          new NodejsFunction(scope, 'my-handler', {
            entry: path.join(tmpDir, name),
            depsLockFilePath: lockFile,
            bundling: {
              bundlerConfig: path.join(tmpDir, 'build.mjs'),
            },
          }),
      ).toThrow(ValidationError);
    },
  );

  it('auto-detects entry from .js sibling when no .ts exists', () => {
    const jsEntry = path.join(tmpDir, 'handler.js');
    fs.writeFileSync(jsEntry, 'module.exports.handler = () => {};');

    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: jsEntry,
          depsLockFilePath: lockFile,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).not.toThrow();
  });

  it('throws when no pnpm-lock.yaml is found anywhere', () => {
    vi.spyOn(utilModule, 'findUp').mockReturnValueOnce(undefined);

    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).toThrow(ValidationError);
  });

  it('throws when an explicit depsLockFilePath does not exist', () => {
    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          depsLockFilePath: path.join(tmpDir, 'does-not-exist.yaml'),
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).toThrow(ValidationError);
  });

  it('auto-detects depsLockFilePath by walking up when not provided', () => {
    vi.spyOn(utilModule, 'findUp').mockReturnValueOnce(lockFile);

    const scope = makeScope();
    expect(
      () =>
        new NodejsFunction(scope, 'my-handler', {
          entry: entryFile,
          projectRoot: tmpDir,
          bundling: {
            bundlerConfig: path.join(tmpDir, 'build.mjs'),
          },
        }),
    ).not.toThrow();
  });
});
