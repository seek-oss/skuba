import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../../../../testing/memfs.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { pruneDevDeps } from './pruneDevDeps.js';

vi.mock('fs-extra', () => ({
  default: memfs,
  ...memfs,
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const BEFORE_DOCKERFILE = `\
ARG BASE_IMAGE

###

FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN CI=true pnpm install --offline --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`;

describe('patchDockerfiles', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
  });

  it('should skip if no Dockerfiles found', async () => {
    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles found',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile does not use the skuba BASE_IMAGE pattern', async () => {
    vol.fromJSON(
      {
        Dockerfile: `FROM node:24-alpine AS build\n\nCOPY . .\nRUN pnpm install --offline\nRUN pnpm build\n`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "FROM node:24-alpine AS build

      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      ",
      }
    `);
  });

  it('should skip if Dockerfile has RUN pnpm prune --prod', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN pnpm prune --prod
###
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if the Dockerfile as RUN pnpm deploy', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN pnpm deploy
###
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile has no ARG BASE_IMAGE', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/node_modules node_modules
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile has no COPY --from=build /workdir/node_modules', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply without writing files in lint mode', async () => {
    vol.fromJSON(
      {
        Dockerfile: BEFORE_DOCKERFILE,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'lint' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should apply the multi-stage build patch', async () => {
    vol.fromJSON(
      {
        Dockerfile: BEFORE_DOCKERFILE,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm prune --prod
      RUN CI=true pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should handle the ${BASE_IMAGE}:${BASE_TAG} image reference', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE
ARG BASE_TAG

###

FROM \${BASE_IMAGE}:\${BASE_TAG} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN CI=true pnpm install --offline --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE
      ARG BASE_TAG

      ###

      FROM \${BASE_IMAGE}:\${BASE_TAG} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm prune --prod
      RUN CI=true pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should insert prune before an existing install --offline --frozen-lockfile --prod command', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE

###

FROM \${BASE_IMAGE} AS build
COPY . .
RUN CI=true pnpm install --offline --frozen-lockfile
RUN CI=true pnpm build
RUN CI=true pnpm install --offline --frozen-lockfile --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN CI=true pnpm install --offline --frozen-lockfile
      RUN CI=true pnpm build
      RUN CI=true pnpm prune --prod
      RUN CI=true pnpm install --offline --frozen-lockfile --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should patch only applicable Dockerfiles when multiple are present', async () => {
    vol.fromJSON(
      {
        Dockerfile: BEFORE_DOCKERFILE,
        'Dockerfile.dev-deps': `FROM node:24-alpine AS dev-deps\n\nRUN pnpm fetch\n`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    expect(result['Dockerfile.dev-deps']).toMatchInlineSnapshot(`
      "FROM node:24-alpine AS dev-deps

      RUN pnpm fetch
      "
    `);

    expect(result.Dockerfile).toMatchInlineSnapshot(`
      "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm prune --prod
      RUN CI=true pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      "
    `);
  });

  it('should insert prune before an existing install --prod command', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE

###

FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN CI=true pnpm install --offline --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm prune --prod
      RUN CI=true pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should insert prune before an existing install --prod command without CI=true', async () => {
    vol.fromJSON(
      {
        Dockerfile: `\
ARG BASE_IMAGE

###

FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
RUN pnpm install --offline --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
ENV NODE_ENV=production
`,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      RUN CI=true pnpm prune --prod
      RUN pnpm install --offline --prod

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/node_modules node_modules
      COPY --from=build /workdir/package.json package.json
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should patch multiple applicable Dockerfiles', async () => {
    vol.fromJSON(
      {
        Dockerfile: BEFORE_DOCKERFILE,
        'services/api/Dockerfile': BEFORE_DOCKERFILE,
      },
      process.cwd(),
    );

    await expect(
      pruneDevDeps({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    expect(result.Dockerfile).toContain('RUN CI=true pnpm prune --prod');
    expect(result['services/api/Dockerfile']).toContain(
      'RUN CI=true pnpm prune --prod',
    );
  });
});
