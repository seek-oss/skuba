import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../utils/logging.js';
import { configForPackageManager } from '../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { patchInstrumentation } from './patchInstrumentation.js';

vi.mock('../../../../../../utils/exec.js', () => ({
  createExec: () => vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
});

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('patchInstrumentation', () => {
  it('should skip if no Dockerfile files are found', async () => {
    await expect(
      patchInstrumentation({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile files found',
    } satisfies PatchReturnType);
  });

  it('should skip if no imports for Datadog or OpenTelemetry instrumentation are found in source files', async () => {
    vol.fromJSON({
      Dockerfile: '',
      'src/index.ts': '',
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason:
        'no imports for Datadog or OpenTelemetry instrumentation found in source files',
    } satisfies PatchReturnType);
  });

  it('should patch a Dockerfile with dd-trace import and explicit node CMD', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD ["node", "lib/listen.js"]`,
      'src/index.ts': "import tracer from 'dd-trace';",
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD ["node", "--import", "dd-trace/initialize.mjs", "lib/listen.js"]",
        "src/index.ts": "import tracer from 'dd-trace';",
      }
    `);
  });

  it('should patch a Dockerfile with @opentelemetry/api import and explicit node CMD', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD ["node", "lib/listen.js"]`,
      'src/index.ts': "import { trace } from '@opentelemetry/api';",
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD ["node", "--experimental-loader", "@opentelemetry/instrumentation/hook.mjs", "lib/listen.js"]",
        "src/index.ts": "import { trace } from '@opentelemetry/api';",
      }
    `);
  });

  it('should patch a Dockerfile with both dd-trace and @opentelemetry/api imports and explicit node CMD', async () => {
    const logWarnSpy = vi
      .spyOn(log, 'warn')
      .mockImplementation(() => undefined);

    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD ["node", "lib/listen.js"]`,
      'src/index.ts': `
          import tracer from 'dd-trace';
          import { trace } from '@opentelemetry/api';
        `,
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(logWarnSpy).toHaveBeenCalledWith(
      'Found imports for both Datadog and OpenTelemetry instrumentation in source files, unsure which to patch',
    );

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD ["node", "--import", "dd-trace/initialize.mjs", "--experimental-loader", "@opentelemetry/instrumentation/hook.mjs", "lib/listen.js"]",
        "src/index.ts": "
                import tracer from 'dd-trace';
                import { trace } from '@opentelemetry/api';
              ",
      }
    `);
  });

  it('should patch a Dockerfile with dd-trace import and implicit node CMD', async () => {
    vol.fromJSON(
      {
        Dockerfile: `FROM node:14
CMD ["lib/listen.js"]`,
        'src/index.ts': "import tracer from 'dd-trace';",
      },
      process.cwd(),
    );

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD ["--import", "dd-trace/initialize.mjs", "lib/listen.js"]",
        "src/index.ts": "import tracer from 'dd-trace';",
      }
    `);
  });

  it('should patch a Dockerfile with @opentelemetry/api import and implicit node CMD', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD ["lib/listen.js"]`,
      'src/index.ts': "import { trace } from '@opentelemetry/api';",
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD ["--experimental-loader", "@opentelemetry/instrumentation/hook.mjs", "lib/listen.js"]",
        "src/index.ts": "import { trace } from '@opentelemetry/api';",
      }
    `);
  });

  it('should patch a Dockerfile with a dd-trace import and shell form CMD', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD node lib/listen.js`,
      'src/index.ts': "import tracer from 'dd-trace';",
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD node --import dd-trace/initialize.mjs lib/listen.js",
        "src/index.ts": "import tracer from 'dd-trace';",
      }
    `);
  });

  it('should patch a Dockerfile with a @opentelemetry/api import and shell form CMD', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD node lib/listen.js`,
      'src/index.ts': "import { trace } from '@opentelemetry/api';",
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD node --experimental-loader @opentelemetry/instrumentation/hook.mjs lib/listen.js",
        "src/index.ts": "import { trace } from '@opentelemetry/api';",
      }
    `);
  });

  it('should patch a Dockerfile with both dd-trace and @opentelemetry/api imports and shell form CMD', async () => {
    const logWarnSpy = vi
      .spyOn(log, 'warn')
      .mockImplementation(() => undefined);

    vol.fromJSON({
      Dockerfile: `FROM node:14
CMD node lib/listen.js`,
      'src/index.ts': `
          import tracer from 'dd-trace';
          import { trace } from '@opentelemetry/api';
        `,
    });

    await expect(patchInstrumentation(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(logWarnSpy).toHaveBeenCalledWith(
      'Found imports for both Datadog and OpenTelemetry instrumentation in source files, unsure which to patch',
    );

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:14
      CMD node --import dd-trace/initialize.mjs --experimental-loader @opentelemetry/instrumentation/hook.mjs lib/listen.js",
        "src/index.ts": "
                import tracer from 'dd-trace';
                import { trace } from '@opentelemetry/api';
              ",
      }
    `);
  });
});
