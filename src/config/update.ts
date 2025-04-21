import fs from 'fs-extra';

const REGEX = /export const lastPatchedVersion = ['"]([^'"]+)['"]/gm;

export const updateSkubaConfigVersion = async ({
  path,
  version,
}: {
  version: string;
  path: string;
}): Promise<void> => {
  let currentContent;
  try {
    currentContent = await fs.readFile(path, 'utf-8');
  } catch {
    currentContent =
      'import type { SkubaConfig } from "skuba";\n\nconst config: SkubaConfig = {};\n\nexport default config;\n';
  }

  if (REGEX.test(currentContent)) {
    const updatedConfig = currentContent.replace(
      REGEX,
      `export const lastPatchedVersion = '${version}'`,
    );
    await fs.writeFile(path, updatedConfig, 'utf-8');
  } else {
    const lines = currentContent.split('\n');
    const lastImportLine = lines.findIndex((line) => line.startsWith('import'));

    if (lastImportLine === -1) {
      lines.unshift(
        `// This is the version of skuba that patches were last applied at.\n// Skuba will automatically update this version when patches are applied, do not change it manually.\nexport const lastPatchedVersion = '${version}';\n`,
      );
    } else {
      lines.splice(
        lastImportLine + 1,
        0,
        `\nexport const lastPatchedVersion = '${version}';`,
      );
    }

    await fs.writeFile(path, lines.join('\n'), 'utf-8');
  }
};
