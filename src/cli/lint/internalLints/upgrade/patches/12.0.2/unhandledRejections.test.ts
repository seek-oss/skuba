import { inspect } from 'util';

import memfs, { vol } from 'memfs';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

import type { PatchConfig } from '../../index.js';

import {
  IMPORT_REGEX,
  NAMED_EXPORT_REGEX,
  tryPatchUnhandledRejections,
} from './unhandledRejections.js';

const LISTENER_WITH_CALLBACK = `
import { app } from 'src/app.js';
import { config } from 'src/config.js';
import { logger } from 'src/framework/logging.js';

app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    logger.debug(\`listening on port \${address.port}\`);
  }
});
`;

const LISTENER_WITHOUT_CALLBACK = `
import { app } from 'src/app';
import { config } from 'src/config';

app.listen(config.port);
`;

const LOGGER_WITH_EXPORT_CONST = `
import { createLogger } from '@seek/logger';

export const logger = createLogger();
`;

const LOGGER_WITH_EXPORT = `
import { createLogger } from '@seek/logger';

const rootLogger = createLogger();

export { xyz, rootLogger };
`;

const LOGGER_WITH_DEFAULT_EXPORT = `
import { createLogger } from '@seek/logger';

export default createLogger();
`;

const consoleLog = jest.spyOn(console, 'log').mockImplementation();

const writeFile = jest.spyOn(memfs.fs.promises, 'writeFile');

afterEach(() => jest.clearAllMocks());

describe('IMPORT_REGEX', () => {
  test.each([
    {
      identifier: 'logger',
      statement: 'import logger from "src/framework/logger";',
    },
    {
      identifier: 'rootLogger',
      statement: "import rootLogger from 'src/framework/logging';",
    },

    {
      identifier: 'logger',
      statement: "import logger from './logging.js'",
    },
    {
      identifier: 'rootLogger',
      statement: 'import rootLogger from "../logger.ts"',
    },

    {
      identifier: 'logger',
      statement: 'import {logger} from "lib/utils/logger";',
    },
    {
      identifier: 'baseLogger',
      statement:
        "import   {   logger   as   baseLogger   }   from   'src/logging';",
    },
    {
      identifier: 'logger',
      statement: "import   { logger }   from   'src/logging/index';",
    },
    {
      identifier: 'logger',
      statement: "import   { logger }   from   'src/logging/index.ts';",
    },
  ])(
    'extracts `$identifier` from `$statement`',
    ({ identifier, statement }) => {
      const result = IMPORT_REGEX.exec(statement);

      expect(result?.[3] ?? result?.[2] ?? result?.[1]).toBe(identifier);
    },
  );

  test.each([
    '',
    `import {logger} from 'src/logging.json';`,
    `import rootLogger from 'src/dunno';`,
    `import contextStorage    from 'src/framework/logger';`,
    `import { logger as contextStorage } from './logging.js';`,
    `import { contextStorage as logger } from './logging.js';`,
    `import { somethingElse, logger } from './logging.js';`,
  ])('does not match `%s`', (statement) =>
    expect(IMPORT_REGEX.test(statement)).toBe(false),
  );
});

describe('NAMED_EXPORT_REGEX', () => {
  test.each([
    {
      identifier: 'logger',
      statement: 'export { logger }',
    },
    {
      identifier: 'logger',
      statement: `
        export {
          a,
          b,
          logger,
          c
        }
      `,
    },
    {
      identifier: 'rootLoggerLogger',
      statement: 'export { somethingElse, lolo, rootLoggerLogger }',
    },
    {
      identifier: 'logger',
      statement: 'export const logger = createLogger()',
    },
    {
      identifier: 'baseLogger',
      statement: 'export const baseLogger = createLogger()',
    },
  ])(
    'extracts `$identifier` from `$statement`',
    ({ identifier, statement }) => {
      const result = NAMED_EXPORT_REGEX.exec(statement);

      expect(result?.[1]).toBe(identifier);
    },
  );

  test.each([
    '',
    `export {}`,
    `export { no, matches, here }`,
    `export const random = true;`,
    `export function logger() {}`,
  ])('does not match `%s`', (statement) =>
    expect(NAMED_EXPORT_REGEX.test(statement)).toBe(false),
  );
});

describe('unhandledRejections', () => {
  it('patches a listener with a callback', async () => {
    vol.fromJSON({ 'src/listen.ts': LISTENER_WITH_CALLBACK });

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/listen.ts": "import { app } from 'src/app.js';
      import { config } from 'src/config.js';
      import { logger } from 'src/framework/logging.js';

      app.listen(config.port, () => {
        const address = listener.address();

        if (typeof address === 'object' && address) {
          logger.debug(\`listening on port \${address.port}\`);
        }
      });

      // Report unhandled rejections instead of crashing the process
      // Make sure to monitor these reports and alert as appropriate
      process.on('unhandledRejection', (err) =>
        logger.error(err, 'Unhandled promise rejection'),
      );
      ",
      }
    `);
  });

  it('patches a listener with an export const logger', async () => {
    vol.fromJSON({
      'src/listen.ts': LISTENER_WITHOUT_CALLBACK,
      'src/framework/logging.ts': LOGGER_WITH_EXPORT_CONST,
    });

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/framework/logging.ts": "
      import { createLogger } from '@seek/logger';

      export const logger = createLogger();
      ",
        "src/listen.ts": "import { app } from 'src/app';
      import { config } from 'src/config';

      app.listen(config.port);

      import { logger } from 'src/framework/logging';

      // Report unhandled rejections instead of crashing the process
      // Make sure to monitor these reports and alert as appropriate
      process.on('unhandledRejection', (err) =>
        logger.error(err, 'Unhandled promise rejection'),
      );
      ",
      }
    `);
  });

  it('patches a listener with an export {} logger', async () => {
    vol.fromJSON({
      'src/listen.ts': LISTENER_WITHOUT_CALLBACK,
      'src/logger.ts': LOGGER_WITH_EXPORT,
    });

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/listen.ts": "import { app } from 'src/app';
      import { config } from 'src/config';

      app.listen(config.port);

      import { rootLogger } from 'src/logger';

      // Report unhandled rejections instead of crashing the process
      // Make sure to monitor these reports and alert as appropriate
      process.on('unhandledRejection', (err) =>
        rootLogger.error(err, 'Unhandled promise rejection'),
      );
      ",
        "src/logger.ts": "
      import { createLogger } from '@seek/logger';

      const rootLogger = createLogger();

      export { xyz, rootLogger };
      ",
      }
    `);
  });

  it('patches a listener with a default export logger', async () => {
    vol.fromJSON({
      'src/listen.ts': LISTENER_WITHOUT_CALLBACK,
      'src/logger.ts': LOGGER_WITH_DEFAULT_EXPORT,
    });

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/listen.ts": "import { app } from 'src/app';
      import { config } from 'src/config';

      app.listen(config.port);

      import logger from 'src/logger';

      // Report unhandled rejections instead of crashing the process
      // Make sure to monitor these reports and alert as appropriate
      process.on('unhandledRejection', (err) =>
        logger.error(err, 'Unhandled promise rejection'),
      );
      ",
        "src/logger.ts": "
      import { createLogger } from '@seek/logger';

      export default createLogger();
      ",
      }
    `);
  });

  it('falls back to console.error if no logger is located', async () => {
    vol.fromJSON({
      'src/listen.ts': LISTENER_WITHOUT_CALLBACK,
      'src/utils/aiGeneratedThisFilename.ts': LOGGER_WITH_DEFAULT_EXPORT,
    });

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/listen.ts": "import { app } from 'src/app';
      import { config } from 'src/config';

      app.listen(config.port);

      // Report unhandled rejections instead of crashing the process
      // Make sure to monitor these reports and alert as appropriate
      process.on('unhandledRejection', (err) =>
        console.error(err, 'Unhandled promise rejection'),
      );
      ",
        "src/utils/aiGeneratedThisFilename.ts": "
      import { createLogger } from '@seek/logger';

      export default createLogger();
      ",
      }
    `);
  });

  it('handles a lack of relevant files', async () => {
    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no applicable src/listen.ts entry points found',
    });

    expect(volToJson()).toStrictEqual({});
  });

  it('handles a filesystem error', async () => {
    const err = new Error('Badness!');

    writeFile.mockRejectedValueOnce(err);

    const files = { 'src/listen.ts': LISTENER_WITH_CALLBACK };

    vol.fromJSON(files);

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'due to an error',
    });

    expect(volToJson()).toStrictEqual(files);

    expect(consoleLog).toHaveBeenCalledWith(
      'Failed to patch listeners for unhandled promise rejections',
    );
    expect(consoleLog).toHaveBeenCalledWith(inspect(err));
  });

  it('skips files that already contain unhandledRejection', async () => {
    const files = {
      'src/listen.ts': `
import { app } from 'src/app.js';
import { config } from 'src/config.js';
import { logger } from 'src/framework/logging.js';

process.on('unhandledRejection', (err) =>
  logger.fatal(err, 'Unhandled promise rejection'),
);

app.listen(config.port);
`,
    };

    vol.fromJSON(files);

    await expect(
      tryPatchUnhandledRejections({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no applicable src/listen.ts entry points found',
    });

    expect(volToJson()).toStrictEqual(files);
  });
});
