import { z } from 'zod';

import { projectTypeSchema } from '../../utils/manifest';
import { packageManagerSchema } from '../../utils/packageManager';

export interface Input {
  /**
   * Whether to enable verbose debug logging.
   *
   * Defaults to `false`.
   */
  debug: boolean;
}

export type InitConfigInput = z.infer<typeof initConfigInputSchema>;

export const initConfigInputSchema = z.object({
  destinationDir: z.string(),
  templateComplete: z.boolean(),
  templateData: z
    .object({
      ownerName: z.string(),
      repoName: z.string(),
      platformName: z.union([z.literal('amd64'), z.literal('arm64')]),
      defaultBranch: z.string(),
    })
    .catchall(z.string()),
  templateName: z.string(),
});

export type InitConfig = z.infer<typeof initConfigSchema>;

// eslint-disable-next-line unused-imports/no-unused-vars
const initConfigSchema = initConfigInputSchema
  .omit({
    templateData: true,
  })
  .extend({
    templateData: z
      .object({
        ownerName: z.string(),
        repoName: z.string(),
        defaultBranch: z.string(),

        // Derived from ownerName
        // TODO: use zod to transform `InitConfigInput` -> `InitConfig`?
        orgName: z.string(),
        teamName: z.string(),

        // Generated by init command
        port: z.string(),
      })
      .catchall(z.string()),

    entryPoint: z.string().optional(),
    packageManager: packageManagerSchema,
    type: projectTypeSchema.optional(),
  });
