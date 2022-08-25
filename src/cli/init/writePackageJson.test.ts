import path from 'path';

import fs from 'fs-extra';

import * as packageAnalysis from '../configure/analysis/package';

import { writePackageJson } from './writePackageJson';

describe('writePackageJson', () => {
  jest
    .spyOn(packageAnalysis, 'getDestinationManifest')
    .mockImplementation((props) =>
      Promise.resolve({
        packageJson: {} as any,
        path: path.join(props?.cwd ?? '/', 'package.json'),
      }),
    );

  const writeFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

  afterEach(() => writeFile.mockClear());

  it('writes a skuba section', async () => {
    await expect(
      writePackageJson({
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
          "/package.json",
          "{
        "skuba": {
          "entryPoint": "src/app.ts",
          "template": "hello-world",
          "type": "package",
          "version": "0.0.1"
        }
      }
      ",
        ],
      ]
    `);
  });
});
