import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'path';

import fs from 'fs-extra';

import * as packageAnalysis from '../configure/analysis/package.js';

import { writePackageJson } from './writePackageJson.js';

describe('writePackageJson', () => {
  vi.spyOn(packageAnalysis, 'getDestinationManifest')
    .mockImplementation((props) =>
      Promise.resolve({
        packageJson: {} as any,
        path: path.join(props?.cwd ?? '/', 'package.json'),
      }),
    );

  const writeFile = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue();

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
