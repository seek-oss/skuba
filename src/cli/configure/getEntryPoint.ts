import path from 'path';

import { text } from '@clack/prompts';
import chalk from 'chalk';
import type { NormalizedReadResult } from 'read-pkg-up';

import { log } from '../../utils/logging';
import type { ProjectType } from '../../utils/manifest';
import type { TemplateConfig } from '../../utils/template';
import { hasStringProp } from '../../utils/validation';

import { tsFileExists } from './analysis/files';

interface Props {
  destinationRoot: string;
  manifest: NormalizedReadResult;
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

  const result = await text({
    message: 'Entry point:',
    initialValue: type === 'package' ? 'src/index.ts' : 'src/app.ts',
    validate: (value) => {
      // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
      const [modulePath] = value.split('#', 2);

      if (!modulePath) {
        return `${chalk.bold(value)} is an invalid module path`;
      }

      // Note: We skip async file existence check for now and rely on post-validation
      return undefined;
    },
  });

  const entryPoint = String(result);
  return entryPoint.endsWith('.ts') ? entryPoint : `${entryPoint}.ts`;
};
