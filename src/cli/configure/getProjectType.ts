import { select } from '@clack/prompts';
import type { NormalizedReadResult } from 'read-pkg-up';

import { log } from '../../utils/logging';
import {
  PROJECT_TYPES,
  type ProjectType,
  projectTypeSchema,
} from '../../utils/manifest';
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

  const result = await select({
    message: 'Project type:',
    options: PROJECT_TYPES.map((type) => ({ value: type, label: type })),
    initialValue: initial,
  });

  return result as ProjectType;
};
