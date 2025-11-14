import { styleText } from 'node:util';
import path from 'path';

import { input } from '@inquirer/prompts';

import { log } from '../../utils/logging.js';
import type { ProjectType } from '../../utils/manifest.js';
import type { TemplateConfig } from '../../utils/template.js';
import { hasStringProp } from '../../utils/validation.js';

import { tsFileExists } from './analysis/files.js';
import type { ReadResult } from './types.js';

interface Props {
  destinationRoot: string;
  manifest: ReadResult;
  templateConfig: TemplateConfig;
  type: ProjectType;
}
export const getEntryPoint = async ({
  destinationRoot,
  manifest,
  templateConfig,
  type,
}: Props) => {
  if (hasStringProp(manifest.packageJson.skuba, 'entryPoint')) {
    return manifest.packageJson.skuba.entryPoint;
  }

  if (templateConfig.entryPoint !== undefined) {
    return templateConfig.entryPoint;
  }

  log.newline();

  const result = await input({
    message: 'Entry point:',
    default: type === 'package' ? 'src/index.ts' : 'src/app.ts',
    validate: async (value) => {
      // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
      const [modulePath] = value.split('#', 2);

      if (!modulePath) {
        return `${styleText('bold', value)} is an invalid module path`;
      }

      const exists = await tsFileExists(path.join(destinationRoot, modulePath));

      return exists || `${styleText('bold', value)} is not a TypeScript file.`;
    },
  });

  return result.endsWith('.ts') ? result : `${result}.ts`;
};
