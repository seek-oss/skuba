import path from 'path';

import { expect, it } from 'vitest';
import {
  type Reporter,
  type SerializedError,
  type TestModule,
  type Vitest,
  startVitest,
} from 'vitest/node';

import {
  type AnnotationEntry,
  generateAnnotationEntries,
} from './annotations.js';

const fixturesDir = path.join(import.meta.dirname, 'fixtures');

const fixturePath = (fixture: string) =>
  path.relative(process.cwd(), path.join(fixturesDir, fixture));

/**
 * Captures the annotations that our mapping layer derives from a real Vitest
 * run, exercising it against Vitest's own reported test modules and error
 * formatting rather than hand-built fixtures.
 */
class CaptureReporter implements Reporter {
  entries: AnnotationEntry[] = [];

  private ctx: Vitest | undefined;

  onInit(ctx: Vitest) {
    this.ctx = ctx;
  }

  onTestRunEnd(
    testModules: readonly TestModule[],
    unhandledErrors: readonly SerializedError[],
  ) {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    this.entries = generateAnnotationEntries({
      ctx,
      testModules,
      unhandledErrors,
    });
  }
}

const runVitest = async (
  include: string[],
  projects?: Array<{ name: string; include: string[] }>,
): Promise<AnnotationEntry[]> => {
  const reporter = new CaptureReporter();

  const vitest = await startVitest([], {
    // Ignore the repository's own Vitest config.
    config: false,
    root: fixturesDir,
    watch: false,
    include,
    reporters: [reporter],
    coverage: { enabled: false },
    ...(projects && {
      projects: projects.map(({ name, include: projectInclude }) => ({
        test: { name, include: projectInclude, root: fixturesDir },
      })),
    }),
  });

  await vitest.close();

  return reporter.entries;
};

it('reports a passing run without annotations', async () => {
  await expect(runVitest(['passing.fixture.ts'])).resolves.toEqual([
    { annotations: [], projectName: undefined, ok: true },
  ]);
});

it('annotates a failing test at its stack location', async () => {
  const entries = await runVitest(['failing.fixture.ts']);

  expect(entries).toEqual([
    {
      annotations: [
        {
          annotation_level: 'failure',
          path: fixturePath('failing.fixture.ts'),
          start_line: 5,
          end_line: 5,
          start_column: 15,
          end_column: 15,
          message: expect.stringContaining('expected 1 to be 2'),
          title: 'Vitest',
        },
      ],
      projectName: undefined,
      ok: false,
    },
  ]);
});

it('annotates a collection error against its module', async () => {
  const entries = await runVitest(['broken.fixture.ts']);

  expect(entries).toEqual([
    {
      annotations: [
        {
          annotation_level: 'failure',
          path: fixturePath('broken.fixture.ts'),
          start_line: 3,
          end_line: 3,
          start_column: 7,
          end_column: 7,
          message: expect.stringContaining('Error: Failed to collect'),
          title: 'Vitest',
        },
      ],
      projectName: undefined,
      ok: false,
    },
  ]);
});

it('groups annotations by project', async () => {
  const entries = await runVitest(
    ['*.fixture.ts'],
    [
      { name: 'alpha', include: ['passing.fixture.ts'] },
      { name: 'beta', include: ['failing.fixture.ts'] },
    ],
  );

  expect(entries).toEqual([
    { annotations: [], projectName: 'alpha', ok: true },
    {
      annotations: [
        expect.objectContaining({ path: fixturePath('failing.fixture.ts') }),
      ],
      projectName: 'beta',
      ok: false,
    },
  ]);
});
