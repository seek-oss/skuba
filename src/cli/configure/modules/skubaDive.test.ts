import { parsePackage } from '../processing/package.js';
import {
  assertDefined,
  defaultOpts,
  defaultPackageOpts,
  executeModule,
} from '../testing/module.js';

import { skubaDiveModule } from './skubaDive.js';

describe('skubaDiveModule', () => {
  const SKUBA_DIVE_PACKAGE_JSON = JSON.stringify({
    dependencies: {
      'skuba-dive': '1.0.0',
    },
  });

  it('works from scratch', async () => {
    const inputFiles = {
      'package.json': SKUBA_DIVE_PACKAGE_JSON,
    };

    const outputFiles = await executeModule(
      skubaDiveModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['src/app.ts']).toBeUndefined();

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.dependencies).toHaveProperty('skuba-dive');
  });

  it('disables itself on missing dependency', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        dependencies: {},
      }),
      'src/app.ts': 'console.log();\n',
      'src/register.ts': 'console.log();\n',
    };

    const outputFiles = await executeModule(
      skubaDiveModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['src/app.ts']).toBe(inputFiles['src/app.ts']);
    expect(outputFiles['src/register.ts']).toBe(inputFiles['src/register.ts']);

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.dependencies).not.toHaveProperty('skuba-dive');
  });

  it('disables itself on packages', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        dependencies: {},
      }),
      'src/app.ts': 'console.log();\n',
      'src/index.ts': 'console.log();\n',
    };

    const outputFiles = await executeModule(
      skubaDiveModule,
      inputFiles,
      defaultPackageOpts,
    );

    expect(outputFiles['src/app.ts']).toBe(inputFiles['src/app.ts']);
    expect(outputFiles['src/index.ts']).toBe(inputFiles['src/index.ts']);

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.dependencies).not.toHaveProperty('skuba-dive');
  });

  it('registers entry point directly under src', async () => {
    const inputFiles = {
      'package.json': SKUBA_DIVE_PACKAGE_JSON,
      'src/app.ts': 'console.log();\n',
    };

    const outputFiles = await executeModule(
      skubaDiveModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['src/app.ts']).toBe(
      "import 'skuba-dive/register';\n\nconsole.log();\n",
    );
  });

  it('registers entry point indirectly under src', async () => {
    const inputFiles = {
      'package.json': SKUBA_DIVE_PACKAGE_JSON,
      'src/register.ts': 'console.log();\n',
      'src/nested/index.ts': 'console.error();\n',
    };

    const outputFiles = await executeModule(skubaDiveModule, inputFiles, {
      ...defaultOpts,
      entryPoint: 'src/nested/index.ts',
    });

    expect(outputFiles['src/register.ts']).toBe(
      "import 'skuba-dive/register';\n\nconsole.log();\n",
    );
    expect(outputFiles['src/nested/index.ts']).toBe(
      "import '../register';\n\nconsole.error();\n",
    );
  });
});
