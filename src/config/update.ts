import path from 'node:path';

import fs from 'fs-extra';

const REGEX = /export const lastPatchedVersion\s*=\s*(['"])([^'"]+)(['"])/gm;

export const getSkubaConfigTsVersionLines = (version: string) =>
  `// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '${version}';
`;

export const updateSkubaConfigVersion = async ({
  path: configPath,
  version,
}: {
  version: string;
  path: string;
}): Promise<void> => {
  let currentContent;
  try {
    currentContent = await fs.readFile(configPath, 'utf-8');
  } catch {
    currentContent =
      "import type { SkubaConfig } from 'skuba';\n\nconst config: SkubaConfig = {};\n\nexport default config;\n";
  }

  if (REGEX.test(currentContent)) {
    const updatedConfig = currentContent.replace(
      REGEX,
      `export const lastPatchedVersion = $1${version}$3`,
    );
    await fs.writeFile(configPath, updatedConfig, 'utf-8');
  } else {
    const lines = currentContent.split('\n');
    const lineToInsertBefore = lines.findIndex(
      (line) =>
        line.startsWith('export default') || line.startsWith('const config'),
    );

    if (lineToInsertBefore === -1) {
      lines.unshift(getSkubaConfigTsVersionLines(version));
    } else {
      lines.splice(
        lineToInsertBefore,
        0,
        getSkubaConfigTsVersionLines(version),
      );
    }

    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, lines.join('\n'), 'utf-8');
  }
};
