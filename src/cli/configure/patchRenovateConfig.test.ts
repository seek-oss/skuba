import memfs, { fs, vol } from 'memfs';

import * as Git from '../../api/git';

import { tryPatchRenovateConfig } from './patchRenovateConfig';

jest.mock('fs-extra', () => memfs);

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

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

it('patches a JSON config', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'VersionNet' });

  vol.fromJSON({
    'renovate.json': JSON,
  });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  await expect(fs.promises.readFile('renovate.json', 'utf-8')).resolves
    .toMatchInlineSnapshot(`
    "{
      "extends": [
        "local>seek-jobs/renovate-config",
        "github>seek-oss/rynovate:third-party-major"
      ]
    }
    "
  `);
});

it('patches a JSON5 config', async () => {
  getOwnerAndRepo.mockResolvedValue({
    owner: 'sEEkAsIa',
    repo: 'VersionCobol',
  });

  vol.fromJSON({ '.github/renovate.json5': JSON5 });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  await expect(fs.promises.readFile('.github/renovate.json5', 'utf-8')).resolves
    .toMatchInlineSnapshot(`
    "{
      extends: [
        // nice one bro
        'local>seekasia/renovate-config',

        'seek',
      ],
    }
    "
  `);
});
