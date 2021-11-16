import git, { ReadCommitResult } from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { getHeadSha, getOwnerRepo } from './util';

const dir = process.cwd();

beforeEach(() => {
  mocked(git.listRemotes).mockResolvedValue([
    { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
  ]);
  mocked(git.log).mockResolvedValue([
    { oid: 'cdd335a418c3dc6804be1c642b19bb63437e2cad' } as ReadCommitResult,
  ]);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('getOwnerRepo', () => {
  it('should extract a GitHub owner and repo from Git remotes', () => {
    expect(getOwnerRepo(dir)).toStrictEqual({
      owner: 'seek-oss',
      repo: 'skuba',
    });
  });
});

describe('getHeadSha', () => {
  it('should extract a GitHub owner and repo from Git remotes', () => {
    expect(getHeadSha(dir)).toBe('cdd335a418c3dc6804be1c642b19bb63437e2cad');
  });
});
