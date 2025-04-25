import { Select } from 'enquirer';

import type { LoadedSkubaConfig } from '../../config/load';
import { ProjectType } from '../../config/types';
import { log } from '../../utils/logging';
import type { TemplateConfig } from '../../utils/template';

interface Props {
  skubaConfig: LoadedSkubaConfig;
  templateConfig: TemplateConfig;
}

export const getProjectType = async ({
  skubaConfig,
  templateConfig,
}: Props): Promise<ProjectType> => {
  if (skubaConfig.projectType) {
    return skubaConfig.projectType;
  }

  if (templateConfig.type !== undefined) {
    return templateConfig.type;
  }

  log.newline();
  const projectTypePrompt = new Select({
    choices: ProjectType.options,
    message: 'Project type:',
    name: 'projectType',
    initial: 'application' as const,
  });

  return projectTypePrompt.run();
};
