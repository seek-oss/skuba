import { parsePackage } from '../processing/package';
import { assertDefined, defaultOpts, executeModule } from '../testing/module';

import { skubaDiveModule } from './skubaDive';

jest.mock('latest-version', () => ({
  __esModule: true,
  default: () => Promise.resolve('0.0.1'),
}));

describe('skubaDiveModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

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

  it('registers entry point directly under src', async () => {
    const inputFiles = {
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

  it('drops bundled dependencies', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        dependencies: {
          'module-alias': '0.0.1',
          'something-else': '0.0.1',
        },
      }),
    };

    const outputFiles = await executeModule(
      skubaDiveModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.dependencies).toHaveProperty('skuba-dive');
    expect(outputData.dependencies).not.toHaveProperty('module-alias');
    expect(outputData.dependencies).toHaveProperty('something-else', '0.0.1');
  });
});
