import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../../../../testing/memfs.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchAgentFromAppServer } from './patchAgentFromAppServer.js';

vi.mock('fs-extra', () => ({
  default: memfs,
  ...memfs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
}));
import * as Git from '@skuba-lib/api/git';

const findRoot = vi.mocked(Git.findRoot);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);
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

const original = `import type Router from '@koa/router';
import type Koa from 'koa';
import request from 'supertest';

import { createApp } from '#src/framework/server.js';

/**
 * Create a new SuperTest agent from a Koa application.
 */
export const agentFromApp = <State, Context>(app: Koa<State, Context>) =>
  request.agent(app.callback());

/**
 * Create a new SuperTest agent from a set of Koa middleware.
 */
export const agentFromMiddleware = <State, Context>(
  ...middleware: Array<Koa.Middleware<State, Context>>
) => {
  const app = createApp(...middleware);

  return agentFromApp(app);
};

/**
 * Create a new SuperTest agent from a Koa router.
 */
export const agentFromRouter = (router: Router) => {
  const app = createApp(router.routes(), router.allowedMethods());

  return agentFromApp(app);
};
`;

const expected = `import { createServer } from 'http';

import type Router from '@koa/router';
import type Koa from 'koa';
import request from 'supertest';
import { afterAll } from 'vitest';

import { createApp } from '#src/framework/server.js';

/**
 * Create a new SuperTest agent from a Koa application.
 */
export const agentFromApp = <State, Context>(app: Koa<State, Context>) => {
  const server = createServer(app.callback()).listen(0, '127.0.0.1');

  afterAll(() => {
    server.close();
  });

  return request.agent(server);
};

/**
 * Create a new SuperTest agent from a set of Koa middleware.
 */
export const agentFromMiddleware = <State, Context>(
  ...middleware: Array<Koa.Middleware<State, Context>>
) => {
  const app = createApp(...middleware);

  return agentFromApp(app);
};

/**
 * Create a new SuperTest agent from a Koa router.
 */
export const agentFromRouter = (router: Router) => {
  const app = createApp(router.routes(), router.allowedMethods());

  return agentFromApp(app);
};
`;

describe('patchAgentFromAppServer', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if no source files are found', async () => {
    vol.fromJSON({ 'README.md': '' }, process.cwd());

    await expect(
      patchAgentFromAppServer({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no source files found',
    } satisfies PatchReturnType);
  });

  it('should skip if there is no agentFromApp function', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `import request from 'supertest';

export const agentFromKoa = (app: Koa) => request.agent(app.callback());
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no agentFromApp functions to migrate',
    } satisfies PatchReturnType);
  });

  it('should skip if agentFromApp is already migrated', async () => {
    vol.fromJSON({ 'src/testing/server.ts': expected }, process.cwd());

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no agentFromApp functions to migrate',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toBe(expected);
  });

  it('should not modify files in lint mode', async () => {
    vol.fromJSON({ 'src/testing/server.ts': original }, process.cwd());

    await expect(
      patchAgentFromAppServer({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toBe(original);
  });

  it('should migrate an arrow function with an expression body', async () => {
    vol.fromJSON({ 'src/testing/server.ts': original }, process.cwd());

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import type Router from '@koa/router';
      import type Koa from 'koa';
      import request from 'supertest';

      import { createApp } from '#src/framework/server.js';

      /**
       * Create a new SuperTest agent from a Koa application.
       */
      export const agentFromApp = <State, Context>(app: Koa<State, Context>) =>
        {
      const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };

      /**
       * Create a new SuperTest agent from a set of Koa middleware.
       */
      export const agentFromMiddleware = <State, Context>(
        ...middleware: Array<Koa.Middleware<State, Context>>
      ) => {
        const app = createApp(...middleware);

        return agentFromApp(app);
      };

      /**
       * Create a new SuperTest agent from a Koa router.
       */
      export const agentFromRouter = (router: Router) => {
        const app = createApp(router.routes(), router.allowedMethods());

        return agentFromApp(app);
      };
      "
    `);
  });

  it('should migrate an arrow function with a block body', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `import request from 'supertest';

export const agentFromApp = (app: Koa) => {
  return request.agent(app.callback());
};
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import request from 'supertest';

      export const agentFromApp = (app: Koa) => {
        const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };
      "
    `);
  });

  it('should migrate a function declaration', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `import supertest from 'supertest';

export function agentFromApp(koaApp: Koa) {
  return supertest.agent(koaApp.callback());
}
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import supertest from 'supertest';

      export function agentFromApp(koaApp: Koa) {
        const server = createServer(koaApp.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return supertest.agent(server);
      }
      "
    `);
  });

  it('should migrate a function expression', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `import request from 'supertest';

export const agentFromApp = function (app: Koa) {
  return request.agent(app.callback());
};
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import request from 'supertest';

      export const agentFromApp = function (app: Koa) {
        const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };
      "
    `);
  });

  it('should add imports to a file without imports', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `export const agentFromApp = (app: Koa) => request.agent(app.callback());
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      export const agentFromApp = (app: Koa) => {
      const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };
      "
    `);
  });

  it('should not modify other functions that call request.agent', async () => {
    const contents = `import request from 'supertest';

export const agentFromKoa = (app: Koa) => request.agent(app.callback());

export const agentFromApp = (app: Koa) => request.agent(app.callback());
`;

    vol.fromJSON({ 'src/testing/server.ts': contents }, process.cwd());

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/testing/server.ts']).toMatchInlineSnapshot(`
      "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import request from 'supertest';

      export const agentFromKoa = (app: Koa) => request.agent(app.callback());

      export const agentFromApp = (app: Koa) => {
      const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };
      "
    `);
  });

  it('should update multiple files', async () => {
    vol.fromJSON(
      {
        'src/testing/server.ts': `import request from 'supertest';

export const agentFromApp = (app: Koa) => request.agent(app.callback());
`,
        'packages/api/src/testing/server.ts': `import supertest from 'supertest';

export function agentFromApp(app: Koa) {
  return supertest.agent(app.callback());
}
`,
        'src/other.ts': `export const other = 1;
`,
      },
      process.cwd(),
    );

    await expect(patchAgentFromAppServer(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "packages/api/src/testing/server.ts": "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import supertest from 'supertest';

      export function agentFromApp(app: Koa) {
        const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return supertest.agent(server);
      }
      ",
        "src/other.ts": "export const other = 1;
      ",
        "src/testing/server.ts": "import { createServer } from 'http';
      import { afterAll } from 'vitest';

      import request from 'supertest';

      export const agentFromApp = (app: Koa) => {
      const server = createServer(app.callback()).listen(0, '127.0.0.1');

      afterAll(() => {
      server.close();
      });

      return request.agent(server);
      };
      ",
      }
    `);
  });
});
