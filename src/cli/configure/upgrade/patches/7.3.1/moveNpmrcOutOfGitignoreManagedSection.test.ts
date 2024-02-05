import fs from 'fs-extra';

import * as packageAnalysis from '../../../analysis/package';
import * as projectAnalysis from '../../../analysis/project';

import { tryMoveNpmrcOutOfGitignoreManagedSection } from './moveNpmrcOutOfGitignoreManagedSection';

jest
  .spyOn(packageAnalysis, 'getDestinationManifest')
  .mockResolvedValue({ path: '~/project/package.json' } as any);

const createDestinationFileReader = jest
  .spyOn(projectAnalysis, 'createDestinationFileReader')
  .mockReturnValue(() => {
    throw new Error('Not implemented!');
  });

const writeFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

beforeEach(jest.clearAllMocks);

describe('tryMoveNpmrcOutOfGitignoreManagedSection', () => {
  describe('format mode', () => {
    it('moves a .gitignore out', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('format', '~/project'),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(writeFile.mock.calls.flat().join('\n')).toMatchInlineSnapshot(`
        "~/project/.gitignore
        # managed by skuba
        stuff
        other stuff
        # end managed by skuba

        # Ignore .npmrc. Previously managed by skuba, but removed as pnpm projects require a managed .npmrc.
        # If migrating to pnpm, remove this line.
        # IMPORTANT: Ensure you add a .npmrc file IN THE SAME COMMIT to avoid secret exposure.
        # skuba can generate an .npmrc for you with \`skuba format\` if you move to pnpm - but committing an empty file is sufficient for security reasons.
        .npmrc
        "
      `);
    });

    it('should be a no-op if ignored then un-ignored', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba\n!.npmrc`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('format', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'not ignored',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should be a no-op if ignored out of managed section', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba\n.npmrc`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('format', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'already ignored in unmanaged section',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should be a no-op if not ignored', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(`# managed by skuba\nstuff\n# end managed by skuba`),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('format', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'not ignored',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('lint mode', () => {
    it('flags moving a .gitignore out', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('lint', '~/project'),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should be a no-op if ignored then un-ignored', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba\n!.npmrc`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('lint', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'not ignored',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should be a no-op if ignored out of managed section', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(
          `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba\n.npmrc`,
        ),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('lint', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'already ignored in unmanaged section',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should be a no-op if not ignored', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(`# managed by skuba\nstuff\n# end managed by skuba`),
      );

      await expect(
        tryMoveNpmrcOutOfGitignoreManagedSection('lint', '~/project'),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'not ignored',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
