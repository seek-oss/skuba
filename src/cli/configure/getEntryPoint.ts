import path from 'path';

import chalk from 'chalk';
import { Input } from 'enquirer';

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
export const getEntryPoint = ({
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
  const entryPointPrompt = new Input({
    initial: type === 'package' ? 'src/index.ts' : 'src/app.ts',
    message: 'Entry point:',
    name: 'entryPoint',
    result: (value) => (value.endsWith('.ts') ? value : `${value}.ts`),
    validate: async (value) => {
      // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
      const [modulePath] = value.split('#', 2);

      if (!modulePath) {
        return `${chalk.bold(value)} is an invalid module path`;
      }

      const exists = await tsFileExists(path.join(destinationRoot, modulePath));

      return exists || `${chalk.bold(value)} is not a TypeScript file.`;
    },
  });

  return entryPointPrompt.run();
};
