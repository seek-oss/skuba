import { inferParser, runPrettier } from './prettier';
import path from 'path';
import { log } from '../../utils/logging';

describe('inferParser', () => {
  test.each`
    filepath                            | parser
    ${'/usr/local/bin/secret.json'}     | ${'json'}
    ${'C:\\Users\\Devloper\\My CV.yml'} | ${'yaml'}
    ${'CODEOWNERS'}                     | ${undefined}
    ${'client.tsx'}                     | ${'typescript'}
    ${'server.ts'}                      | ${'typescript'}
    ${'vanilla.js'}                     | ${'babel'}
  `(
    'inferParser($filepath) === $parser',
    async ({ filepath, parser }) =>
      await expect(inferParser(filepath)).resolves.toBe(parser),
  );
});

describe('runPrettier', () => {
  const originalConsoleLog = console.log;

  beforeAll(() => (console.log = () => undefined));
  afterAll(() => (console.log = originalConsoleLog));

  it('handles a default directory', async () => {
    await expect(runPrettier('lint', log)).resolves.toMatchObject({
      // Use a minimal expectation to avoid double-reporting linting issues
      // across our test & lint CI steps and impeding our self-autofixes.
      ok: expect.any(Boolean),
      result: {
        count: expect.any(Number),
        errored: expect.any(Array),
        touched: expect.any(Array),
        unparsed: expect.arrayContaining(['LICENSE']),
      },
    });
  });

  it('handles a custom directory', async () => {
    await expect(
      runPrettier(
        'lint',
        log,
        path.join(__dirname, '../../../integration/base/fixable'),
      ),
    ).resolves.toMatchInlineSnapshot(`
      {
        "ok": false,
        "result": {
          "count": 8,
          "errored": [
            {
              "filepath": "integration/base/fixable/b.md",
            },
            {
              "filepath": "integration/base/fixable/c.json",
            },
            {
              "filepath": "integration/base/fixable/d.js",
            },
            {
              "filepath": "integration/base/fixable/package.json",
            },
          ],
          "touched": [],
          "unparsed": [],
        },
      }
    `);
  });
});
