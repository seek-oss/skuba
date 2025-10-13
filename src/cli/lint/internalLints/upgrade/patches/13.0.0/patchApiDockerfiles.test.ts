import memfs, { vol } from 'memfs';

import { Git } from '../../../../../../index.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchApiDockerfiles } from './patchApiDockerfiles.js';

jest.mock('../../../../../../index.js', () => ({
  Git: {
    getOwnerAndRepo: jest.fn(),
  },
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string, opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

jest.spyOn(console, 'warn').mockImplementation(() => {
  /* do nothing */
});
jest.spyOn(console, 'log').mockImplementation(() => {
  /* do nothing */
});

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
  jest
    .mocked(Git.getOwnerAndRepo)
    .mockResolvedValue({ repo: 'test-repo', owner: 'seek' });
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

describe('tryPatchApiDockerfiles', () => {
  it('should skip if no Dockerfiles are found', async () => {
    vol.fromJSON({});

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no Dockerfiles found',
    });
  });

  it('should skip if no patchable Dockerfiles are found', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
RUN yarn install
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS build
RUN yarn install
",
}
`);
  });

  it('should skip if package.json is already copied from the same --from source', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=build /workdir/node_modules node_modules
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=build /workdir/node_modules node_modules
CMD ["node", "lib/listen.js"]
",
}
`);
  });

  it('should add package.json COPY when missing for root directory', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
CMD ["node", "lib/listen.js"]
",
}
`);
  });

  it('should work with different --from source name', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS builder
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /workdir/lib lib
COPY --from=builder /workdir/node_modules node_modules
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS builder
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /workdir/lib lib
COPY --from=builder /workdir/node_modules node_modules
COPY --from=builder /workdir/package.json package.json
CMD ["node", "lib/listen.js"]
",
}
`);
  });

  it('should add package.json COPY for nested path', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/apps/api/lib apps/api/lib
COPY --from=build /workdir/node_modules node_modules
CMD ["node", "apps/api/lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /workdir/apps/api/lib apps/api/lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/apps/api/package.json apps/api/package.json
CMD ["node", "apps/api/lib/listen.js"]
",
}
`);
  });

  it('should not add package.json if copied from different --from source', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS deps
COPY package.json ./

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=deps package.json package.json
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine AS deps
COPY package.json ./

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=deps package.json package.json
COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
CMD ["node", "lib/listen.js"]
",
}
`);
  });

  it('should skip if using pnpm deploy', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine AS build
WORKDIR /workdir
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm deploy --prod /app

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app .
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    });
  });

  it('should add package.json when COPY does not have --from parameter', async () => {
    vol.fromJSON({
      Dockerfile: `
FROM node:18-alpine
WORKDIR /app
COPY lib lib
COPY node_modules node_modules
CMD ["node", "lib/listen.js"]
`,
    });

    await expect(
      patchApiDockerfiles({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
FROM node:18-alpine
WORKDIR /app
COPY lib lib
COPY node_modules node_modules
COPY package.json package.json
CMD ["node", "lib/listen.js"]
",
}
`);
  });
});
