import fs from 'fs-extra';
import git from 'isomorphic-git';

import { getTags } from './tags';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('getTags', () => {
  it('propagates props to isomorphic-git', async () => {
    jest.mocked(git.listTags).mockResolvedValue(['a', 'b', 'c']);

    await expect(
      getTags({
        dir: '/workdir/skuba',
      }),
    ).resolves.toStrictEqual(['a', 'b', 'c']);

    expect(git.listTags).toBeCalledWith({
      fs,
      dir: '/workdir/skuba',
    });
  });
});
