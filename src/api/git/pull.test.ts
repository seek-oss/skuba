import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { fastForwardBranch } from './pull';

jest.mock('isomorphic-git');

const git = jest.requireMock<typeof Git>('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('fastForwardBranch', () => {
  it('propagates props to isomorphic-git', async () => {
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await fastForwardBranch({
      auth: { token: 'abc', type: 'gitHubApp' },
      dir: '/workdir/skuba',
      ref: 'c'.repeat(40),
      remoteRef: 'feature-a',
    });

    expect(git.fastForward).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(git.fastForward).mock.calls[0]![0],
    ).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      {
        "dir": "/workdir/skuba",
        "fs": Any<Object>,
        "http": Any<Object>,
        "onAuth": [Function],
        "ref": "cccccccccccccccccccccccccccccccccccccccc",
        "remote": undefined,
        "remoteRef": "feature-a",
        "singleBranch": true,
        "url": "https://github.com/seek-oss/skuba",
      }
    `,
    );
  });
});
