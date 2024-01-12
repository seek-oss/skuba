import memfs, { vol } from 'memfs';

import { tryPatchDockerfile } from './patchDockerfile';

jest.mock('fs-extra', () => memfs);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

const dockerfile = `
ARG BASE_IMAGE
ARG BASE_TAG

FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs:18 AS runtime

WORKDIR /workdir
`;

const dockerfileDebian11 = `
ARG BASE_IMAGE
ARG BASE_TAG

FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs20-debian11 AS runtime

WORKDIR /workdir
`;

const dockerfileNonDistroless = `
ARG BASE_IMAGE
ARG BASE_TAG

FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS runtime

WORKDIR /workdir
`;

describe('tryPatchDockerfile', () => {
  describe('format mode', () => {
    it('patches a Dockerfile with nodejs:18', async () => {
      vol.fromJSON({ Dockerfile: dockerfile });

      await expect(tryPatchDockerfile('format')).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
    {
      "Dockerfile": "
    ARG BASE_IMAGE
    ARG BASE_TAG

    FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs18-debian12 AS runtime

    WORKDIR /workdir
    ",
    }
    `);
    });

    it('patches a Dockerfile with nodejs18-debian11', async () => {
      vol.fromJSON({ Dockerfile: dockerfileDebian11 });

      await expect(tryPatchDockerfile('format')).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
    {
      "Dockerfile": "
    ARG BASE_IMAGE
    ARG BASE_TAG

    FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs20-debian12 AS runtime

    WORKDIR /workdir
    ",
    }
    `);
    });

    it('ignores when a Dockerfile is missing', async () => {
      vol.fromJSON({});

      await expect(tryPatchDockerfile('format')).resolves.toEqual({
        result: 'skip',
        reason: 'no Dockerfile found',
      });
    });

    it('ignores when a Dockerfile is not distroless', async () => {
      vol.fromJSON({ Dockerfile: dockerfileNonDistroless });

      await expect(tryPatchDockerfile('format')).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson().Dockerfile).toEqual(dockerfileNonDistroless); // unchanged
    });
  });

  describe('lint mode', () => {
    it('patches a Dockerfile with nodejs:18', async () => {
      vol.fromJSON({ Dockerfile: dockerfile });

      await expect(tryPatchDockerfile('lint')).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson().Dockerfile).toEqual(dockerfile); // unchanged
    });

    it('patches a Dockerfile with nodejs18-debian11', async () => {
      vol.fromJSON({ Dockerfile: dockerfileDebian11 });

      await expect(tryPatchDockerfile('lint')).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson().Dockerfile).toEqual(dockerfileDebian11); // unchanged
    });

    it('ignores when a Dockerfile is missing', async () => {
      vol.fromJSON({});

      await expect(tryPatchDockerfile('lint')).resolves.toEqual({
        result: 'skip',
        reason: 'no Dockerfile found',
      });

      expect(volToJson()).toEqual({}); // unchanged
    });

    it('ignores when a Dockerfile is not distroless', async () => {
      vol.fromJSON({ Dockerfile: dockerfileNonDistroless });

      await expect(tryPatchDockerfile('format')).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson().Dockerfile).toEqual(dockerfileNonDistroless); // unchanged
    });
  });
});
