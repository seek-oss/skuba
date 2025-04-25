import path from 'path';

import chalk from 'chalk';
import { Input } from 'enquirer';

import type { LoadedSkubaConfig } from '../../config/load';
import type { ProjectType } from '../../config/types';
import { log } from '../../utils/logging';
import type { TemplateConfig } from '../../utils/template';

import { tsFileExists } from './analysis/files';

interface Props {
  destinationRoot: string;
  skubaConfig: LoadedSkubaConfig;
  templateConfig: TemplateConfig;
  type: ProjectType;
}
export const getEntryPoint = ({
  destinationRoot,
  skubaConfig,
  templateConfig,
  type,
}: Props) => {
  if (skubaConfig.entryPoint) {
    return skubaConfig.entryPoint;
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
