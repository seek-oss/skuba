// eslint-disable-next-line no-restricted-imports -- want to access unmocked fs in the tests itself
import * as realFs from 'fs/promises';
import path from 'path';

import memfs, { vol } from 'memfs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../utils/logging.js';

import { detectBadCodeowners } from './detectBadCodeowners.js';

vi.mock('fs', () => memfs);

vi.mock('../../..', () => ({
  Git: {
    findRoot: () => Promise.resolve('/path/to/git/root'),
  },
}));

const volToJson = () => vol.toJSON('/', undefined, true);

afterEach(() => vol.reset());
afterEach(vi.resetAllMocks);

const logger = {
  bold: vi.fn(),
  dim: vi.fn(),
  warn: vi.fn(),
} as unknown as Logger;

describe('detectBadCodeowners', () => {
  const CODEOWNERS_PATH = '/path/to/git/root/.github/CODEOWNERS';

  it('should report ok if no file found', async () => {
    vol.fromJSON({});
    await expect(detectBadCodeowners(logger)).resolves.toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });
    expect(volToJson()).toEqual({});
  });

  it("should report ok on skuba's file", async () => {
    const contents = await realFs.readFile(
      path.resolve(import.meta.dirname, '../../../../.github/CODEOWNERS'),
      'utf8',
    );
    vol.fromJSON({ [CODEOWNERS_PATH]: contents });
    await expect(detectBadCodeowners(logger)).resolves.toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });
    expect(volToJson()).toEqual({ [CODEOWNERS_PATH]: contents });
  });

  it('should report ok on skuba templated files', async () => {
    const contents = await realFs.readFile(
      path.resolve(
        import.meta.dirname,
        '../../../../template/base/.github/CODEOWNERS',
      ),
      'utf8',
    );
    vol.fromJSON({ [CODEOWNERS_PATH]: contents });
    await expect(detectBadCodeowners(logger)).resolves.toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });
    expect(volToJson()).toEqual({ [CODEOWNERS_PATH]: contents });
  });

  it('should report not ok on bad CODEOWNERS', async () => {
    const contents = `# Some comment
- @skuba-team
`;
    vol.fromJSON({ [CODEOWNERS_PATH]: contents });
    await expect(detectBadCodeowners(logger)).resolves.toEqual({
      ok: false,
      fixable: false,
      annotations: [
        {
          message:
            'CODEOWNERS file has a line starting with `- `. This is probably an autoformatting mistake, where your editor thinks this file is a markdown file and is trying to format a list item. Did you mean to use `*` instead?',
          path: '.github/CODEOWNERS',
        },
      ],
    });
    expect(volToJson()).toEqual({ [CODEOWNERS_PATH]: contents });
  });

  it('should report on /CODEOWNERS and /docs/CODEOWNERS', async () => {
    const contents = `# Some comment
- @skuba-team
`;
    vol.fromJSON({
      '/path/to/git/root/CODEOWNERS': contents,
      '/path/to/git/root/docs/CODEOWNERS': contents,
    });
    await expect(detectBadCodeowners(logger)).resolves.toEqual({
      ok: false,
      fixable: false,
      annotations: [
        {
          message:
            'CODEOWNERS file has a line starting with `- `. This is probably an autoformatting mistake, where your editor thinks this file is a markdown file and is trying to format a list item. Did you mean to use `*` instead?',
          path: 'CODEOWNERS',
        },
        {
          message:
            'CODEOWNERS file has a line starting with `- `. This is probably an autoformatting mistake, where your editor thinks this file is a markdown file and is trying to format a list item. Did you mean to use `*` instead?',
          path: 'docs/CODEOWNERS',
        },
      ],
    });
  });
});
