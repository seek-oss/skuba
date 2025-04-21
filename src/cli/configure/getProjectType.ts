import { Select } from 'enquirer';
import type { NormalizedReadResult } from 'read-pkg-up';

import { ProjectType } from '../../config/types';
import { log } from '../../utils/logging';
import type { TemplateConfig } from '../../utils/template';
import { hasProp } from '../../utils/validation';

interface Props {
  manifest: NormalizedReadResult;
  templateConfig: TemplateConfig;
}

export const getProjectType = async ({
  manifest,
  templateConfig,
}: Props): Promise<ProjectType> => {
  const projectType = ProjectType.safeParse(
    hasProp(manifest.packageJson.skuba, 'type')
      ? manifest.packageJson.skuba.type
      : null,
  );

  if (projectType.success) {
    return projectType.data;
  }

  if (templateConfig.type !== undefined) {
    return templateConfig.type;
  }

  const initial: ProjectType =
    manifest.packageJson.devDependencies?.['@seek/seek-module-toolkit'] ||
    manifest.packageJson.files
      ? 'package'
      : 'application';

  log.newline();
  const projectTypePrompt = new Select({
    choices: ProjectType.options,
    message: 'Project type:',
    name: 'projectType',
    initial,
  });

  return projectTypePrompt.run();
};
