import * as execModule from '../../utils/exec';

import { MAX_SIZE, TRUNCATION_WARNING, annotate } from './annotate';

const exec = jest.spyOn(execModule, 'exec');
const hasCommand = jest.spyOn(execModule, 'hasCommand');

beforeAll(() => {
  // Mock console.log to prevent output during tests
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

beforeEach(() => {
  jest.clearAllMocks();

  exec.mockResolvedValue(undefined as any);
  hasCommand.mockResolvedValue(true);
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
  const oversizeMarkdown = 'a'.repeat(MAX_SIZE + 100);

  describe.each`
    description                    | opts
    ${'undefined options'}         | ${undefined}
    ${'empty options'}             | ${{}}
    ${'context option'}            | ${{ context: 'skuba-lint' }}
    ${'style option'}              | ${{ style: 'info' }}
    ${'context and style options'} | ${{ context: 'skuba-test', style: 'error' }}
    ${'all options'}               | ${{ context: 'skuba-build', scopeContextToStep: true, style: 'warning' }}
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

    it('warns about truncation when annotation exceeds the maximum size', async () => {
      setEnvironmentVariables();
      await annotate(oversizeMarkdown, opts);

      const lastCall = exec.mock.calls[exec.mock.calls.length - 1];
      if (!lastCall) {
        throw new Error('Expected exec to have been called at least once');
      }

      const lastArgument = lastCall[lastCall.length - 1];

      if (typeof lastArgument !== 'string') {
        throw new Error('Expected the last argument to be a string');
      }

      expect(lastArgument.endsWith(TRUNCATION_WARNING)).toBe(true);
    });

    // it('logs the full message when annotation is truncated', async () => {
    //   setEnvironmentVariables();
    //   await annotate(oversizeMarkdown, opts);

    //   // FIXME: How can I properly mock the logger?
    //   expect(console.log).toHaveBeenCalledWith(
    //     expect.stringContaining(oversizeMarkdown),
    //   );
    // });

    it('skips when `buildkite-agent` is not present', async () => {
      hasCommand.mockResolvedValue(false);

      await expect(annotate(markdown)).resolves.toBeUndefined();

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
