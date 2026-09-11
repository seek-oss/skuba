import { Readable } from 'stream';

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/v4';

import { log } from '../../utils/logging.js';

import { readJSONFromStdIn } from './readJSONFromStdIn.js';

const schema = z.object({
  name: z.string().describe('a name'),
});

const realStdin = process.stdin;

const setStdin = (
  chunks: string[],
  { isTTY = false }: { isTTY?: boolean } = {},
) => {
  const stream = Readable.from(chunks);
  Object.defineProperty(stream, 'isTTY', { value: isTTY, configurable: true });
  Object.defineProperty(process, 'stdin', {
    value: stream,
    configurable: true,
  });
};

const mockExit = () =>
  vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit');
  });

afterEach(() => {
  Object.defineProperty(process, 'stdin', {
    value: realStdin,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe('readJSONFromStdIn', () => {
  it('returns the parsed data for valid input', async () => {
    setStdin([JSON.stringify({ name: 'hello' })]);

    await expect(readJSONFromStdIn(schema)).resolves.toEqual({ name: 'hello' });
  });

  it('prints the schema and exits when stdin is a TTY', async () => {
    // A TTY means nothing was piped in; we should bail rather than hang.
    setStdin([], { isTTY: true });
    const err = vi.spyOn(log, 'err').mockReturnValue(undefined);
    const exit = mockExit();

    await expect(readJSONFromStdIn(schema)).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(err).toHaveBeenCalledWith(
      'No data piped to stdin. Expected JSON satisfying the following schema:',
    );
  });

  it('prints the schema and exits on empty input', async () => {
    setStdin([]);
    const err = vi.spyOn(log, 'err').mockReturnValue(undefined);
    const exit = mockExit();

    await expect(readJSONFromStdIn(schema)).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(err).toHaveBeenCalledWith(
      'No data from stdin. Expected JSON satisfying the following schema:',
    );
  });

  it('prints the schema and exits on invalid JSON', async () => {
    setStdin(['this is not json']);
    const err = vi.spyOn(log, 'err').mockReturnValue(undefined);
    const exit = mockExit();

    await expect(readJSONFromStdIn(schema)).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(err).toHaveBeenCalledWith(
      // Don't assert the precise syntax error
      expect.stringMatching(
        /^Invalid JSON from stdin: .+\. Expected JSON satisfying the following schema:$/,
      ),
    );
  });

  it('exits when the input does not match the schema', async () => {
    setStdin([JSON.stringify({ name: 123 })]);
    const err = vi.spyOn(log, 'err').mockReturnValue(undefined);
    const exit = mockExit();

    await expect(readJSONFromStdIn(schema)).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(err).toHaveBeenCalledWith('Invalid data from stdin:');
  });
});
