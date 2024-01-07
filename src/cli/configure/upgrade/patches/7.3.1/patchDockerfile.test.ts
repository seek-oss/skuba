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

it('patches an existing Dockerfile', async () => {
  vol.fromJSON({ Dockerfile: dockerfile });

  await expect(tryPatchDockerfile()).resolves.toBeUndefined();

  expect(volToJson()).toMatchInlineSnapshot(`
{
  "Dockerfile": "
ARG BASE_IMAGE
ARG BASE_TAG

FROM --platform=\${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs18-debian11 AS runtime

WORKDIR /workdir
",
}
`);
});

it('ignores when a Dockerfile is missing', async () => {
  vol.fromJSON({});

  await expect(tryPatchDockerfile()).resolves.toBeUndefined();
});
