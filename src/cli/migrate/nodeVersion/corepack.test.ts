import { describe, expect, it } from 'vitest';

import { patchDockerfileCorepack } from './corepack.js';

describe('patchDockerfileCorepack', () => {
  it.each([
    [
      'the template instruction',
      'FROM node:26-alpine AS dev-deps\n\nRUN --mount=type=bind,source=package.json,target=package.json \\\n    corepack enable pnpm && corepack install\n\nRUN pnpm fetch\n',
      'FROM node:26-alpine AS dev-deps\n\nRUN npm i -g corepack@0.36.0\n\nRUN pnpm fetch\n',
    ],
    [
      'a single line instruction',
      'RUN --mount=type=bind,source=package.json,target=package.json corepack enable pnpm && corepack install',
      'RUN npm i -g corepack@0.36.0',
    ],
    [
      'an instruction without a mount',
      'COPY package.json .\nRUN corepack enable pnpm && corepack install\n',
      'COPY package.json .\nRUN npm i -g corepack@0.36.0\n',
    ],
    [
      'an instruction that enables every package manager',
      'RUN --mount=type=bind,source=package.json,target=package.json \\\n  corepack enable && corepack install\n',
      'RUN npm i -g corepack@0.36.0\n',
    ],
    [
      'CRLF line endings',
      'RUN --mount=type=bind,source=package.json,target=package.json \\\r\n    corepack enable pnpm && corepack install\r\nRUN pnpm fetch\r\n',
      'RUN npm i -g corepack@0.36.0\r\nRUN pnpm fetch\r\n',
    ],
    [
      'multiple stages',
      'FROM node:26 AS a\nRUN corepack enable pnpm && corepack install\nFROM node:26 AS b\nRUN corepack enable pnpm && corepack install\n',
      'FROM node:26 AS a\nRUN npm i -g corepack@0.36.0\nFROM node:26 AS b\nRUN npm i -g corepack@0.36.0\n',
    ],
    [
      'a pinned Corepack install and COREPACK_DEFAULT_TO_LATEST',
      'FROM node:26-alpine AS dev-deps\n\nRUN npm install --global corepack@0.31.0\n\nENV COREPACK_DEFAULT_TO_LATEST=0\n\nRUN --mount=type=bind,source=package.json,target=package.json \\\n    corepack enable pnpm && corepack install\n\nRUN pnpm fetch\n',
      'FROM node:26-alpine AS dev-deps\n\nRUN npm i -g corepack@0.36.0\n\nRUN pnpm fetch\n',
    ],
    [
      'adjacent instructions',
      'FROM node:26\nENV COREPACK_DEFAULT_TO_LATEST=0\nRUN npm i -g corepack@0.31.0\nRUN corepack enable pnpm && corepack install\nRUN pnpm fetch\n',
      'FROM node:26\nRUN npm i -g corepack@0.36.0\nRUN pnpm fetch\n',
    ],
    [
      'the legacy ENV syntax',
      'ENV COREPACK_DEFAULT_TO_LATEST 0\nRUN pnpm fetch\n',
      'RUN pnpm fetch\n',
    ],
    [
      'a standalone Corepack install',
      'FROM node:26\nRUN npm install corepack@0.31.0 --global\nRUN pnpm fetch\n',
      'FROM node:26\nRUN npm i -g corepack@0.36.0\nRUN pnpm fetch\n',
    ],
    [
      'Corepack installs across stages',
      'FROM node:26 AS a\nRUN npm install -g corepack@0.31.0\nRUN corepack enable pnpm && corepack install\nFROM node:26 AS b\nRUN npm install -g corepack\n',
      'FROM node:26 AS a\nRUN npm i -g corepack@0.36.0\nFROM node:26 AS b\nRUN npm i -g corepack@0.36.0\n',
    ],
    [
      'CRLF line endings with a pinned Corepack install',
      'RUN npm install --global corepack@0.31.0\r\nENV COREPACK_DEFAULT_TO_LATEST=0\r\nRUN corepack enable pnpm && corepack install\r\n',
      'RUN npm i -g corepack@0.36.0\r\n',
    ],
  ])('replaces %s', (_, before, after) => {
    expect(patchDockerfileCorepack(before, '0.36.0')).toBe(after);
  });

  it.each([
    ['an already migrated instruction', 'RUN npm i -g corepack@0.36.0\n'],
    [
      'an instruction with additional commands',
      'RUN corepack enable pnpm && corepack install && pnpm fetch\n',
    ],
    [
      'an instruction with other mounts',
      'RUN --mount=type=secret,id=npm,dst=/root/.npmrc \\\n    corepack enable pnpm && corepack install\n',
    ],
    ['a comment', '# corepack enable pnpm && corepack install\n'],
    [
      'other COREPACK_DEFAULT_TO_LATEST values',
      'ENV COREPACK_DEFAULT_TO_LATEST=1\n',
    ],
    ['a local Corepack install', 'RUN npm install corepack@0.31.0\n'],
    [
      'a Corepack install with additional commands',
      'RUN npm install --global corepack@0.31.0 && corepack enable pnpm\n',
    ],
  ])('leaves %s alone', (_, contents) => {
    expect(patchDockerfileCorepack(contents, '0.36.0')).toBe(contents);
  });
});
