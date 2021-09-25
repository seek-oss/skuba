import * as execModule from '../../utils/exec';

import { annotate } from '.';

const exec = jest.spyOn(execModule, 'exec');

beforeEach(() => {
  jest.clearAllMocks();

  exec.mockResolvedValue(undefined as any);
});

afterEach(() => {
  delete process.env.BUILDKITE;
  delete process.env.BUILDKITE_AGENT_ACCESS_TOKEN;
  delete process.env.BUILDKITE_JOB_ID;
  delete process.env.BUILDKITE_STEP_ID;
});

const setEnvironmentVariables = () => {
  process.env.BUILDKITE = 'true';
  process.env.BUILDKITE_AGENT_ACCESS_TOKEN = 'token';
  process.env.BUILDKITE_JOB_ID = 'job-id';
  process.env.BUILDKITE_STEP_ID = 'step-id';
};

describe('annotate', () => {
  const markdown = '**Message**';

  describe.each`
    description                    | opts
    ${'undefined options'}         | ${undefined}
    ${'empty options'}             | ${{}}
    ${'context option'}            | ${{ context: 'skuba-lint' }}
    ${'style option'}              | ${{ style: 'info' }}
    ${'context and style options'} | ${{ context: 'skuba-test', style: 'error' }}
  `('with $description', ({ opts }) => {
    it('annotates when environment variables are set', async () => {
      setEnvironmentVariables();

      await expect(annotate(markdown, opts)).resolves.toBeUndefined();

      expect(
        [null, ...exec.mock.calls.flat(), null].join('\n'),
      ).toMatchSnapshot();
    });

    it('skips when environment variables are not set', async () => {
      await expect(annotate(markdown)).resolves.toBeUndefined();

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
