import path from 'path';

import chalk from 'chalk';
import { Input } from 'enquirer';
import type { NormalizedReadResult } from 'read-pkg-up';

import type { ProjectType } from '../../config/types';
import { log } from '../../utils/logging';
import type { TemplateConfig } from '../../utils/template';
import { hasStringProp } from '../../utils/validation';

import { tsFileExists } from './analysis/files';

interface Props {
  destinationRoot: string;
  manifest: NormalizedReadResult;
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
