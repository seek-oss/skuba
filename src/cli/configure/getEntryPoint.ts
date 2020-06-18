import path from 'path';

import chalk from 'chalk';
import { Input } from 'enquirer';
import { NormalizedReadResult } from 'read-pkg-up';

import { ProjectType } from '../../utils/manifest';
import { TemplateConfig } from '../../utils/template';
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

  if (typeof templateConfig.entryPoint !== 'undefined') {
    return templateConfig.entryPoint;
  }

  const entryPointPrompt = new Input({
    initial: type === 'package' ? 'src/index.ts' : 'src/app.ts',
    message: 'Entry point:',
    name: 'entryPoint',
    result: (value) => (value.endsWith('.ts') ? value : `${value}.ts`),
    validate: async (value) => {
      const exists = await tsFileExists(path.join(destinationRoot, value));

      return exists || `${chalk.bold(value)} is not a TypeScript file.`;
    },
  });

  return entryPointPrompt.run();
};
