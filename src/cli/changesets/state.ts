import { readPreState } from '@changesets/pre';
import readChangesets from '@changesets/read';
import type { NewChangeset, PreState } from '@changesets/types';

export interface ChangesetState {
  preState: PreState | undefined;
  changesets: NewChangeset[];
}

export const readChangesetState = async (
  dir: string,
): Promise<ChangesetState> => {
  const preState = await readPreState(dir);
  const isInPreMode = preState !== undefined && preState.mode === 'pre';

  let changesets = await readChangesets(dir);

  if (isInPreMode) {
    const changesetsToFilter = new Set(preState.changesets);
    changesets = changesets.filter((x) => !changesetsToFilter.has(x.id));
  }

  return {
    preState: isInPreMode ? preState : undefined,
    changesets,
  };
};
