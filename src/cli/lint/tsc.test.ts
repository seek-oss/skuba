import { PassThrough } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';

import { type Options, execa } from 'execa';
import { beforeEach, expect, test, vi } from 'vitest';

import { createExec } from '../../utils/exec.js';

import { runTscInNewProcess } from './tsc.js';

const subprocessInput = vi.hoisted(() => ({ script: '' }));

vi.mock('../../utils/exec.js', () => ({
  createExec: vi.fn((options: Options) =>
    vi.fn(() =>
      execa(process.execPath, ['-e', subprocessInput.script], options),
    ),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  subprocessInput.script = '';
});

const captureOutput = () => {
  const chunks: Buffer[] = [];
  const stream = new PassThrough().on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  return {
    stream,
    output: () => stripVTControlCharacters(Buffer.concat(chunks).toString()),
  };
};

test.each([false, true])(
  'streams prefixed output with debug=%s',
  async (debug) => {
    subprocessInput.script = `
    process.stdout.write('first\\nsecond');
    process.stdout.write(Buffer.from([0xc3]));
    setImmediate(() => {
      process.stdout.write(Buffer.from([0xa9, 0x0a]));
      process.stdout.write('last');
      process.stderr.write('diagnostic');
    });
  `;
    const { stream, output } = captureOutput();

    await expect(
      runTscInNewProcess({ debug, serial: true, tscOutputStream: stream }),
    ).resolves.toBe(true);

    const args = [...(debug ? ['--extendedDiagnostics'] : []), '--noEmit'];
    expect(vi.mocked(createExec).mock.results[0]?.value).toHaveBeenCalledWith(
      'tsc',
      ...args,
    );
    expect(output()).toContain('tsc    │ first\n');
    expect(output()).toContain('tsc    │ second\u00e9\n');
    expect(output()).toContain('tsc    │ last\n');
    expect(output()).toContain('tsc    │ diagnostic\n');
    expect(output()).toMatch(
      new RegExp(`tsc    │ tsc ${args.join(' ')} exited with code 0\\n$`),
    );
    expect(stream.writableEnded).toBe(false);

    await expect(
      runTscInNewProcess({ debug, serial: true, tscOutputStream: stream }),
    ).resolves.toBe(true);
    expect(stream.writableEnded).toBe(false);
  },
);

test('returns false and forwards diagnostics for a failed process', async () => {
  subprocessInput.script = `
    process.stderr.write('type error\\n');
    process.exitCode = 2;
  `;
  const { stream, output } = captureOutput();

  await expect(
    runTscInNewProcess({ debug: false, serial: true, tscOutputStream: stream }),
  ).resolves.toBe(false);
  expect(output()).toBe(
    'tsc    │ type error\ntsc    │ tsc --noEmit exited with code 2\n',
  );
  expect(stream.writableEnded).toBe(false);
});

test('returns false when launching the process throws', async () => {
  vi.mocked(createExec).mockImplementationOnce(() => () => {
    throw new Error('Unable to launch tsc');
  });
  const { stream } = captureOutput();

  await expect(
    runTscInNewProcess({ debug: false, serial: true, tscOutputStream: stream }),
  ).resolves.toBe(false);
  expect(stream.writableEnded).toBe(false);
});
