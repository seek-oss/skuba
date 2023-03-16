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
    // Preceding comment
    'seek',
    // Succeeding comment
  ]
}
`;

const getOwnerAndRepo = jest.spyOn(Git, 'getOwnerAndRepo');

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

it('patches a JSON config for a SEEK-Jobs project', async () => {
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

it('patches a JSON5 config for a seekasia project', async () => {
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
        // Preceding comment
        'local>seekasia/renovate-config',

        'seek',
        // Succeeding comment
      ],
    }
    "
  `);
});

it('skips a seek-oss project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'seek-oss', repo: 'skuba' });

  vol.fromJSON({
    'renovate.json5': JSON5,
  });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  await expect(fs.promises.readFile('renovate.json5', 'utf-8')).resolves.toBe(
    JSON5,
  );
});

it('skips a personal project', async () => {
  getOwnerAndRepo.mockResolvedValue({ owner: 'Seekie1337', repo: 'fizz-buzz' });

  vol.fromJSON({
    '.renovaterc': JSON,
  });

  await expect(tryPatchRenovateConfig()).resolves.toBeUndefined();

  await expect(fs.promises.readFile('.renovaterc', 'utf-8')).resolves.toBe(
    JSON,
  );
});
