import fs from 'fs-extra';

import type { PatchConfig } from '../..';
import * as packageAnalysis from '../../../../../configure/analysis/package';
import * as projectAnalysis from '../../../../../configure/analysis/project';

import { tryMoveNpmrcOutOfIgnoreManagedSection } from './moveNpmrcOutOfIgnoreManagedSection';

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

describe('tryMoveNpmrcOutOfIgnoreManagedSection', () => {
  describe.each(['.gitignore', '.dockerignore'] as const)(
    'with %s',
    (fileName) => {
      describe('format mode', () => {
        it(`moves an .npmrc out`, async () => {
          createDestinationFileReader.mockReturnValue(() =>
            Promise.resolve(
              `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba`,
            ),
          );

          await expect(
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'format',
              dir: '~/project',
            } as PatchConfig),
          ).resolves.toEqual({
            result: 'apply',
          });

          expect(writeFile.mock.calls.map((c) => c[0])).toEqual([
            `~/project/${fileName}`,
          ]);
          expect((writeFile.mock.calls.map((c) => c[1]) as string[]).join('\n'))
            .toMatchInlineSnapshot(`
            "# managed by skuba
            stuff
            other stuff
            # end managed by skuba

            # Ignore .npmrc. This is no longer managed by skuba as pnpm projects use a managed .npmrc.
            # IMPORTANT: if migrating to pnpm, remove this line and add an .npmrc IN THE SAME COMMIT.
            # You can use \`skuba format\` to generate the file or otherwise commit an empty file.
            # Doing so will conflict with a local .npmrc and make it more difficult to unintentionally commit auth secrets.
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
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'format',
              dir: '~/project',
            } as PatchConfig),
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
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'format',
              dir: '~/project',
            } as PatchConfig),
          ).resolves.toEqual({
            result: 'skip',
            reason: 'already ignored in unmanaged section',
          });

          expect(writeFile).not.toHaveBeenCalled();
        });

        it('should be a no-op if not ignored', async () => {
          createDestinationFileReader.mockReturnValue(() =>
            Promise.resolve(
              `# managed by skuba\nstuff\n# end managed by skuba`,
            ),
          );

          await expect(
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'format',
              dir: '~/project',
            } as PatchConfig),
          ).resolves.toEqual({
            result: 'skip',
            reason: 'not ignored',
          });

          expect(writeFile).not.toHaveBeenCalled();
        });
      });

      describe('lint mode', () => {
        it('flags moving an .npmrc out', async () => {
          createDestinationFileReader.mockReturnValue(() =>
            Promise.resolve(
              `# managed by skuba\nstuff\n.npmrc\nother stuff\n# end managed by skuba`,
            ),
          );

          await expect(
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'lint',
              dir: '~/project',
            } as PatchConfig),
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
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'lint',
              dir: '~/project',
            } as PatchConfig),
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
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'lint',
              dir: '~/project',
            } as PatchConfig),
          ).resolves.toEqual({
            result: 'skip',
            reason: 'already ignored in unmanaged section',
          });

          expect(writeFile).not.toHaveBeenCalled();
        });

        it('should be a no-op if not ignored', async () => {
          createDestinationFileReader.mockReturnValue(() =>
            Promise.resolve(
              `# managed by skuba\nstuff\n# end managed by skuba`,
            ),
          );

          await expect(
            tryMoveNpmrcOutOfIgnoreManagedSection(fileName)({
              mode: 'lint',
              dir: '~/project',
            } as PatchConfig),
          ).resolves.toEqual({
            result: 'skip',
            reason: 'not ignored',
          });

          expect(writeFile).not.toHaveBeenCalled();
        });
      });
    },
  );
});
