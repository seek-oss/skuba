// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/readChangesetState.ts

import { readPreState } from '@changesets/pre';
import readChangesets from '@changesets/read';
import type { NewChangeset, PreState } from '@changesets/types';

export type ChangesetState = {
  preState: PreState | undefined;
  changesets: NewChangeset[];
};

export default async function readChangesetState(
  cwd: string = process.cwd(),
): Promise<ChangesetState> {
  const preState = await readPreState(cwd);
  const isInPreMode = preState !== undefined && preState.mode === 'pre';

  let changesets = await readChangesets(cwd);

  if (isInPreMode) {
    const changesetsToFilter = new Set(preState.changesets);
    changesets = changesets.filter((x) => !changesetsToFilter.has(x.id));
  }

  return {
    preState: isInPreMode ? preState : undefined,
    changesets,
  };
}
