import fs from 'fs-extra';

import * as Git from '../../api/git';

import { tryPatchRenovateConfig } from './patchRenovateConfig';

const JSON = `
{
  "extends": [
    "github>seek-oss/rynovate:third-party-major"
  ]
}
`;

const JSON5 = `
{
  extends: [
    // nice one bro
    'seek',
  ]
}
`;

const getOwnerAndRepo = jest.spyOn(Git, 'getOwnerAndRepo');

const readFile = jest.spyOn(fs.promises, 'readFile');

const writeFile = jest
  .spyOn(fs.promises, 'writeFile')
  .mockResolvedValue(undefined);

beforeEach(jest.clearAllMocks);

it('patches a JSON config', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'VersionNet' });

  readFile.mockImplementation((filepath) => {
    if (filepath.toString().endsWith('.json5')) {
      return Promise.reject(Object.assign(new Error(), { code: 'ENOENT' }));
    }

    return Promise.resolve(JSON);
  });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(writeFile).toHaveBeenCalledTimes(1);
  expect(writeFile.mock.calls[0]).toMatchInlineSnapshot(`
    [
      ".github/renovate.json",
      "{
      "extends": [
        "local>seek-jobs/renovate-config",
        "github>seek-oss/rynovate:third-party-major"
      ]
    }
    ",
      "utf-8",
    ]
  `);
});

it('patches a JSON5 config', async () => {
  getOwnerAndRepo.mockResolvedValue({
    owner: 'sEEkAsIa',
    repo: 'VersionCobol',
  });

  readFile.mockResolvedValue(JSON5);

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  expect(writeFile).toHaveBeenCalledTimes(1);
  expect(writeFile.mock.calls[0]).toMatchInlineSnapshot(`
    [
      ".github/renovate.json5",
      "{
      extends: [
        // nice one bro
        'local>seekasia/renovate-config',

        'seek',
      ],
    }
    ",
      "utf-8",
    ]
  `);
});
