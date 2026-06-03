import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchDockerfiles } from './addMultistageBuilds.js';

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

const BEFORE_DOCKERFILE = `\
ARG BASE_IMAGE

###

FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build

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
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles found',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile does not use the skuba BASE_IMAGE pattern', async () => {
    vol.fromJSON({
      Dockerfile: `FROM node:24-alpine AS build\n\nCOPY . .\nRUN pnpm install --offline\nRUN pnpm build\n`,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
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
    vol.fromJSON({
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
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if already patched (has COPY --from=deps)', async () => {
    vol.fromJSON({
      Dockerfile: `\
ARG BASE_IMAGE
FROM BASE_IMAGE as deps
RUN pnpm install --offline --prod
RUN pnpm prune --prod
###
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
###
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=deps /workdir/node_modules node_modules
ENV NODE_ENV=production
`,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile has no ARG BASE_IMAGE', async () => {
    vol.fromJSON({
      Dockerfile: `\
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/node_modules node_modules
`,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should skip if Dockerfile has no COPY --from=build /workdir/node_modules', async () => {
    vol.fromJSON({
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
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply without writing files in lint mode', async () => {
    vol.fromJSON({
      Dockerfile: BEFORE_DOCKERFILE,
    });

    await expect(
      patchDockerfiles({ mode: 'lint' } as PatchConfig),
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
    vol.fromJSON({
      Dockerfile: BEFORE_DOCKERFILE,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      FROM \${BASE_IMAGE} AS deps

      COPY . .

      RUN pnpm install --offline --prod
      RUN pnpm prune --prod

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/package.json package.json
      COPY --from=deps /workdir/node_modules node_modules
      ENV NODE_ENV=production
      ",
      }
    `);
  });

  it('should change --from=build to --from=deps in place when no package.json COPY exists', async () => {
    vol.fromJSON({
      Dockerfile: `\
ARG BASE_IMAGE
FROM \${BASE_IMAGE} AS build
COPY . .
RUN pnpm install --offline
RUN pnpm build
FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
`,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "ARG BASE_IMAGE

      FROM \${BASE_IMAGE} AS deps

      COPY . .

      RUN pnpm install --offline --prod
      RUN pnpm prune --prod
      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build
      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=deps /workdir/node_modules node_modules
      ",
      }
    `);
  });

  it('should patch only applicable Dockerfiles when multiple are present', async () => {
    vol.fromJSON({
      Dockerfile: BEFORE_DOCKERFILE,
      'Dockerfile.dev-deps': `FROM node:24-alpine AS dev-deps\n\nRUN pnpm fetch\n`,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
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

      FROM \${BASE_IMAGE} AS deps

      COPY . .

      RUN pnpm install --offline --prod
      RUN pnpm prune --prod

      ###

      FROM \${BASE_IMAGE} AS build
      COPY . .
      RUN pnpm install --offline
      RUN pnpm build

      ###

      FROM gcr.io/distroless/nodejs24-debian13 AS runtime
      WORKDIR /workdir
      COPY --from=build /workdir/lib lib
      COPY --from=build /workdir/package.json package.json
      COPY --from=deps /workdir/node_modules node_modules
      ENV NODE_ENV=production
      "
    `);
  });

  it('should patch multiple applicable Dockerfiles', async () => {
    vol.fromJSON({
      Dockerfile: BEFORE_DOCKERFILE,
      'services/api/Dockerfile': BEFORE_DOCKERFILE,
    });

    await expect(
      patchDockerfiles({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    expect(result.Dockerfile).toContain('COPY --from=deps');
    expect(result['services/api/Dockerfile']).toContain('COPY --from=deps');
  });
});
