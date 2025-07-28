import { inspect } from 'util';

import memfs, { vol } from 'memfs';

import * as Git from '../../../api/git/index.js';

import { tryPatchRenovateConfig } from './patchRenovateConfig.js';
import type { PatchConfig } from './upgrade/index.js';

jest.mock('fs', () => memfs);

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

const JSON5_CONFIGURED = `{extends: ['github>seek-oss/rynovate', local>seek-jobs/renovate-config']}`;

const JSON5_EXTENDED = `{extends: ['github>seek-jobs/custom-config']}`;

const getOwnerAndRepo = jest.spyOn(Git, 'getOwnerAndRepo');

const consoleLog = jest.spyOn(console, 'log').mockImplementation();

const writeFile = jest.spyOn(memfs.fs.promises, 'writeFile');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

describe('patchRenovateConfig', () => {
  describe('format mode', () => {
    it('patches a JSON config for a SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'VersionNet',
      });

      vol.fromJSON({ '.git': null, 'renovate.json': JSON });

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          ".git": null,
          "renovate.json": "{
          "extends": [
            "local>seek-jobs/renovate-config",
            "github>seek-oss/rynovate:third-party-major"
          ]
        }
        ",
        }
      `);
    });

    it('patches a JSON config for a new SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'VersionNet',
      });

      vol.fromJSON({ 'foo/.git': null, 'foo/renovate.json': JSON });

      await expect(
        tryPatchRenovateConfig({ mode: 'format', dir: 'foo' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "foo/.git": null,
          "foo/renovate.json": "{
          "extends": [
            "local>seek-jobs/renovate-config",
            "github>seek-oss/rynovate:third-party-major"
          ]
        }
        ",
        }
      `);
    });

    it('patches a JSON5 config for a seekasia project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'sEEkAsIa',
        repo: 'VersionCobol',
      });

      vol.fromJSON({ '.git': null, '.github/renovate.json5': JSON5 });

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      // Note that `golden-fleece` can't do any better than this imperfect output,
      // but at least it allows us to preserve the comments rather than dropping
      // them entirely.
      expect(volToJson()).toMatchInlineSnapshot(`
        {
          ".git": null,
          ".github/renovate.json5": "{
          extends: [
            // Preceding comment
            'local>seekasia/renovate-config',

            'seek',
            // Succeeding comment
          ],
        }
        ",
        }
      `);
    });

    it('handles a lack of Renovate config', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no config found',
      });

      expect(volToJson()).toStrictEqual(files);
    });

    it('handles a filesystem error', async () => {
      const err = new Error('Badness!');

      writeFile.mockRejectedValueOnce(err);

      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'VersionNet',
      });

      const files = { '.git': null, 'renovate.json5': JSON5 };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(consoleLog).toHaveBeenCalledWith(
        'Failed to patch Renovate config.',
      );
      expect(consoleLog).toHaveBeenCalledWith(inspect(err));
    });

    it('handles a non-Git directory', async () => {
      const err = new Error('Badness!');

      getOwnerAndRepo.mockRejectedValue(err);

      const files = {};

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Git root found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(consoleLog).not.toHaveBeenCalled();
    });

    it('skips a seek-oss project', async () => {
      getOwnerAndRepo.mockResolvedValue({ owner: 'seek-oss', repo: 'skuba' });

      const files = { '.git': null, 'renovate.json5': JSON5 };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'owner does not map to a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a personal project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'Seekie1337',
        repo: 'fizz-buzz',
      });

      const files = { '.git': null, '.renovaterc': JSON };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'owner does not map to a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a strange config without `extends`', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null, '.github/renovate.json5': '{}' };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a configured SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = {
        '.git': null,
        '.github/renovate.json5': JSON5_CONFIGURED,
      };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'config already has a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a SEEK-Jobs project which already extends a config', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null, '.github/renovate.json5': JSON5_EXTENDED };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'config already has a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('lint mode', () => {
    it('patches a JSON config for a SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'VersionNet',
      });

      vol.fromJSON({ '.git': null, 'renovate.json': JSON });

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual({ '.git': null, 'renovate.json': JSON });
    });

    it('patches a JSON config for a new SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'VersionNet',
      });

      vol.fromJSON({ 'foo/.git': null, 'foo/renovate.json': JSON });

      await expect(
        tryPatchRenovateConfig({ mode: 'lint', dir: 'foo' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual({
        'foo/.git': null,
        'foo/renovate.json': JSON,
      });
    });

    it('patches a JSON5 config for a seekasia project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'sEEkAsIa',
        repo: 'VersionCobol',
      });

      vol.fromJSON({ '.git': null, '.github/renovate.json5': JSON5 });

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      // unchanged
      expect(volToJson()).toEqual({
        '.git': null,
        '.github/renovate.json5': JSON5,
      });
    });

    it('handles a lack of Renovate config', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no config found',
      });

      expect(volToJson()).toStrictEqual(files);
    });

    it('handles a non-Git directory', async () => {
      const err = new Error('Badness!');

      getOwnerAndRepo.mockRejectedValue(err);

      const files = {};

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Git root found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(consoleLog).not.toHaveBeenCalled();
    });

    it('skips a seek-oss project', async () => {
      getOwnerAndRepo.mockResolvedValue({ owner: 'seek-oss', repo: 'skuba' });

      const files = { '.git': null, 'renovate.json5': JSON5 };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'owner does not map to a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a personal project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'Seekie1337',
        repo: 'fizz-buzz',
      });

      const files = { '.git': null, '.renovaterc': JSON };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'owner does not map to a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a strange config without `extends`', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null, '.github/renovate.json5': '{}' };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a configured SEEK-Jobs project', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = {
        '.git': null,
        '.github/renovate.json5': JSON5_CONFIGURED,
      };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'config already has a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a SEEK-Jobs project which already extends a config', async () => {
      getOwnerAndRepo.mockResolvedValue({
        owner: 'SEEK-Jobs',
        repo: 'monolith',
      });

      const files = { '.git': null, '.github/renovate.json5': JSON5_EXTENDED };

      vol.fromJSON(files);

      await expect(
        tryPatchRenovateConfig({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'config already has a SEEK preset',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
