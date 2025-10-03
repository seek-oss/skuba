import * as execModule from '../../../../src/utils/exec.js';
import { log } from '../../../../src/utils/logging.js';

import { MAX_SIZE, TRUNCATION_WARNING, annotate } from './annotate.js';

const exec = jest.spyOn(execModule, 'exec');
const hasCommand = jest.spyOn(execModule, 'hasCommand');
const mockWarn = jest.spyOn(log, 'warn').mockImplementation(() => undefined);

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
  const endOfMessage = 'EndMessage';
  const oversizeMarkdown = 'a'.repeat(MAX_SIZE).concat(endOfMessage);

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
      await annotate(oversizeMarkdown);

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

    it('logs the full message when annotation is truncated', async () => {
      setEnvironmentVariables();
      await annotate(oversizeMarkdown);

      const lastCall = mockWarn.mock.calls[exec.mock.calls.length - 1];
      if (!lastCall) {
        throw new Error('Expected log.warn to have been called at least once');
      }

      const lastArgument = lastCall[lastCall.length - 1];

      if (typeof lastArgument !== 'string') {
        throw new Error('Expected the last argument to be a string');
      }

      // Check for the end of message in case there's a failure, entire message isn't printed (it's too large)
      expect(lastArgument.endsWith(endOfMessage)).toBe(true);
    });

    it('skips when `buildkite-agent` is not present', async () => {
      hasCommand.mockResolvedValue(false);

      await expect(annotate(markdown)).resolves.toBeUndefined();

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
