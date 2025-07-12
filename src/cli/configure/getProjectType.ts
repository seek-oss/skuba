import { Select } from 'enquirer';
import type { NormalizedReadResult } from 'read-pkg-up';

import { log } from '../../utils/logging.js';
import {
  PROJECT_TYPES,
  type ProjectType,
  projectTypeSchema,
} from '../../utils/manifest.js';
import type { TemplateConfig } from '../../utils/template.js';
import { hasProp } from '../../utils/validation.js';

interface Props {
  manifest: NormalizedReadResult;
  templateConfig: TemplateConfig;
}

export const getProjectType = async ({
  manifest,
  templateConfig,
}: Props): Promise<ProjectType> => {
  const projectType = projectTypeSchema.safeParse(
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
    choices: PROJECT_TYPES,
    message: 'Project type:',
    name: 'projectType',
    initial,
  });

  return projectTypePrompt.run();
};
