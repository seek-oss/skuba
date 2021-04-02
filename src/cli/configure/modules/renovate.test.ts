import {
  defaultOpts,
  defaultPackageOpts,
  executeModule,
} from '../testing/module.js';

import { renovateModule } from './renovate.js';

describe('renovateModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.github/renovate.json5']).toContain(
      'seek-oss/rynovate',
    );
    expect(outputFiles['package.json']).toContain('"private": true');
  });

  it('makes packages publishable', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        private: true,
      }),
    };

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultPackageOpts,
    );

    expect(outputFiles['.github/renovate.json5']).toContain(
      'seek-oss/rynovate',
    );
    expect(outputFiles['package.json']).toContain('"private": false');
  });

  it('deletes rogue configs', async () => {
    const inputFiles = {
      '.github/renovate.json': '{"extends": ["default"]}',
      '.renovaterc.json': undefined,
      'package.json': JSON.stringify({
        $name: 'secret-service',
        renovate: {
          extends: [],
        },
      }),
    };

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.github/renovate.json']).toBeUndefined();
    expect(outputFiles['.github/renovate.json5']).toContain(
      'seek-oss/rynovate',
    );
    expect(outputFiles['.renovaterc.json']).toBeUndefined();
    expect(outputFiles['package.json']).toContain('secret-service');
    expect(outputFiles['package.json']).not.toContain('renovate');
    expect(outputFiles['package.json']).toContain('"private": true');
  });

  it('overwrites divergent config', async () => {
    const inputFiles = {
      '.github/renovate.json5': '["extends": ["default"]}',
    };

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.github/renovate.json5']).toContain(
      'seek-oss/rynovate',
    );
    expect(outputFiles['.github/renovate.json5']).not.toContain('default');
  });

  it('preserves extended config', async () => {
    const inputFiles = {
      '.github/renovate.json5': `{
    "extends": ["github>seek-oss/rynovate:non-critical"],
    "ignorePaths": []
}`,
    };

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.github/renovate.json5']).toBe(`{
  extends: ['github>seek-oss/rynovate:non-critical'],
  ignorePaths: [],
}
`);
  });

  it('migrates extended config', async () => {
    const inputFiles = {
      'renovate.json': '{"extends": ["seek"]}',
    };

    const outputFiles = await executeModule(
      renovateModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.github/renovate.json5']).toBe(
      "{ extends: ['seek'] }\n",
    );

    expect(outputFiles['renovate.json']).toBeUndefined();
  });
});
