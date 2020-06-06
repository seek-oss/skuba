import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';

import { isErrorWithCode } from '../../utils/error';

import { IGNORED_TEMPLATE_FILENAMES } from './prompts';

export const copyTemplateFile = async (
  sourcePath: string,
  destinationPath: string,
  data: Record<string, unknown>,
) => {
  const replacedData = await ejs.renderFile(sourcePath, data);

  await fs.writeFile(destinationPath, replacedData);
};

export const copyTemplate = async (
  sourceDir: string,
  destinationDir: string,
  data: Record<string, unknown>,
) => {
  const filenames = await fs.readdir(sourceDir);

  await Promise.all(
    filenames
      .filter((filename) => !IGNORED_TEMPLATE_FILENAMES.has(filename))
      .map(async (filename) => {
        const sourcePath = path.join(sourceDir, filename);
        const destinationPath = path.join(
          destinationDir,
          filename.replace(/^_/, ''),
        );

        try {
          await copyTemplateFile(sourcePath, destinationPath, data);
        } catch (err) {
          if (isErrorWithCode(err, 'EISDIR')) {
            await fs.ensureDir(destinationPath);
            return copyTemplate(sourcePath, destinationPath, data);
          }

          console.error(`Failed to render '${sourcePath}' with:`, data);

          throw err;
        }
      }),
  );
};
