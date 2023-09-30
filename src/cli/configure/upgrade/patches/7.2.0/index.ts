import { tryAddEmptyExports } from './addEmptyExports';
import { tryPatchDockerfile } from './patchDockerfile';
import { tryPatchRenovateConfig } from './patchRenovateConfig';
import { tryPatchServerListener } from './patchServerListener';
import { tryRefreshIgnoreFiles } from './refreshIgnoreFiles';

export const upgrade = async () => {
  await Promise.all([
    tryAddEmptyExports(),
    tryPatchRenovateConfig(),
    tryPatchDockerfile(),
    tryPatchServerListener(),
    tryRefreshIgnoreFiles(),
  ]);
};
