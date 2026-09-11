import crypto from 'crypto';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReadResult } from '../configure/types.js';

import { resumeTemplating } from './resumeTemplating.js';

vi.mock('./readJSONFromStdIn.js', () => ({
  readJSONFromStdIn: vi.fn(),
}));

const { readJSONFromStdIn } = await import('./readJSONFromStdIn.js');

const TEMP_ROOT = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'integration',
  'resume-templating',
);

let tempDir: string;

const writeProject = async (
  files: Record<string, string>,
): Promise<ReadResult> => {
  tempDir = path.join(TEMP_ROOT, `case-${crypto.randomUUID()}`);
  await fs.ensureDir(tempDir);

  await Promise.all(
    Object.entries(files).map(async ([filepath, contents]) => {
      const target = path.join(tempDir, filepath);
      await fs.ensureDir(path.dirname(target));
      await fs.promises.writeFile(target, contents);
    }),
  );

  return {
    path: path.join(tempDir, 'package.json'),
    packageJson: {
      skuba: { template: 'greeter' },
    } as ReadResult['packageJson'],
  };
};

const skubaTemplateJs = `export default {
  fields: [
    {
      name: 'prodBuildkiteQueueName',
      message: 'Prod Buildkite queue',
      initial: 'my-team-aws-account-prod:cicd',
    },
  ],
  packageManager: 'pnpm',
};
`;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await fs.remove(TEMP_ROOT);
});

describe('resumeTemplating', () => {
  it('renders remaining placeholders and deletes skuba.template.js', async () => {
    vi.mocked(readJSONFromStdIn).mockResolvedValue({
      templateData: { prodBuildkiteQueueName: 'my-queue:cicd' },
    });

    const manifest = await writeProject({
      'package.json': '{}\n',
      '.gitignore': 'node_modules\n',
      'skuba.template.js': skubaTemplateJs,
      'src/app.ts': "export const queue = '<%- prodBuildkiteQueueName %>';\n",
    });

    await resumeTemplating({ manifest, nonInteractive: true });

    await expect(
      fs.promises.readFile(path.join(tempDir, 'src/app.ts'), 'utf8'),
    ).resolves.toBe("export const queue = 'my-queue:cicd';\n");

    await expect(
      fs.pathExists(path.join(tempDir, 'skuba.template.js')),
    ).resolves.toBe(false);
  });

  it('deletes skuba.template.js without prompting when there are no fields', async () => {
    const manifest = await writeProject({
      'package.json': '{}\n',
      'skuba.template.js': `export default { fields: [], packageManager: 'pnpm' };\n`,
    });

    await resumeTemplating({ manifest, nonInteractive: true });

    expect(readJSONFromStdIn).not.toHaveBeenCalled();
    await expect(
      fs.pathExists(path.join(tempDir, 'skuba.template.js')),
    ).resolves.toBe(false);
  });
});
