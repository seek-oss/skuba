import fs from 'fs-extra';

import { writeSkubaConfig } from './writeSkubaConfig';

describe('writeSkubaConfig', () => {
  const writeFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

  afterEach(() => writeFile.mockClear());

  it('writes a skuba section', async () => {
    await expect(
      writeSkubaConfig({
        cwd: '/',
        entryPoint: 'src/app.ts',
        template: 'hello-world',
        type: 'package',
        version: '0.0.1',
      }),
    ).resolves.toBeUndefined();

    expect(writeFile.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "/skuba.config.ts",
          "import type { SkubaConfig } from 'skuba';

      // This is the version of skuba that patches were last applied at.
      // Skuba will automatically update this version when patches are applied, do not change it manually.
      export const lastPatchedVersion = '0.0.1';

      const config: SkubaConfig = {
        entryPoint: 'src/app.ts',
        projectType: 'package',
        template: 'hello-world',
      };

      export default config;
      ",
        ],
      ]
      `);
  });
});
