import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { mountBuildkiteAgent } from './mountBuildkiteAgent.js';

import * as Git from '@skuba-lib/api/git';

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

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
}));

const findRoot = vi.mocked(Git.findRoot);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const DOCKER_COMPOSE = `services:
  app:
    image: \${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
    init: true
    volumes:
      - ./:/workdir
      # Mount agent for Buildkite annotations.
      - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
      # Mount cached dependencies.
      - /workdir/node_modules
`;

const PIPELINE = `agents:
  queue: my-queue

configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
        cache-on:
          - package.json#.packageManager
          - pnpm-lock.yaml
          - pnpm-workspace.yaml
        secrets:
          - id=npm,src=/var/lib/buildkite-agent/.npmrc
          - NPM_TOKEN

  base-steps:
    - &deploy
      commands:
        - echo '--- pnpm install --offline'
        - pnpm install --offline
        - echo '+++ pnpm run deploy'
        - pnpm run deploy
      concurrency: 1
      plugins:
        - *docker-ecr-cache
        - docker-compose#v5.10.0:
            dependencies: false
            environment:
              - GITHUB_API_TOKEN
            propagate-environment: true
            run: app
`;

describe('mountBuildkiteAgent', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if there are no relevant files', async () => {
    vol.fromJSON({ 'package.json': '{}' });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Docker Compose or Buildkite pipeline files found',
    } satisfies PatchReturnType);
  });

  it('should skip if nothing needs migrating', async () => {
    vol.fromJSON({
      'docker-compose.yml': `services:
  app:
    volumes:
      - ./:/workdir
      # Mount cached dependencies.
      - /workdir/node_modules
`,
      '.buildkite/pipeline.yml': `steps:
  - plugins:
      - docker-compose#v5.10.0:
          environment:
            - GITHUB_API_TOKEN
          mount-buildkite-agent: true
          propagate-environment: true
          run: app
`,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Docker Compose buildkite-agent mounts to migrate',
    } satisfies PatchReturnType);
  });

  it('should not modify files in lint mode', async () => {
    vol.fromJSON({
      'docker-compose.yml': DOCKER_COMPOSE,
      '.buildkite/pipeline.yml': PIPELINE,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'lint' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'docker-compose.yml': DOCKER_COMPOSE,
      '.buildkite/pipeline.yml': PIPELINE,
    });
  });

  it('should remove the buildkite-agent mount from docker-compose.yml', async () => {
    vol.fromJSON({
      'docker-compose.yml': DOCKER_COMPOSE,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['docker-compose.yml']).toMatchInlineSnapshot(`
      "services:
        app:
          image: \${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
          init: true
          volumes:
            - ./:/workdir
            # Mount cached dependencies.
            - /workdir/node_modules
      "
    `);
  });

  it('should add mount-buildkite-agent to the docker-compose plugin', async () => {
    vol.fromJSON({
      '.buildkite/pipeline.yml': PIPELINE,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['.buildkite/pipeline.yml']).toMatchInlineSnapshot(`
      "agents:
        queue: my-queue

      configs:
        plugins:
          - &docker-ecr-cache
            seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
              cache-on:
                - package.json#.packageManager
                - pnpm-lock.yaml
                - pnpm-workspace.yaml
              secrets:
                - id=npm,src=/var/lib/buildkite-agent/.npmrc
                - NPM_TOKEN

        base-steps:
          - &deploy
            commands:
              - echo '--- pnpm install --offline'
              - pnpm install --offline
              - echo '+++ pnpm run deploy'
              - pnpm run deploy
            concurrency: 1
            plugins:
              - *docker-ecr-cache
              - docker-compose#v5.10.0:
                  dependencies: false
                  environment:
                    - GITHUB_API_TOKEN
                  mount-buildkite-agent: true
                  propagate-environment: true
                  run: app
      "
    `);
  });

  it('should append mount-buildkite-agent when no later option exists', async () => {
    vol.fromJSON({
      '.buildkite/pipeline.yml': `steps:
  - plugins:
      - docker-compose#v5.10.0:
          dependencies: false
          environment:
            - GITHUB_API_TOKEN
`,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['.buildkite/pipeline.yml']).toMatchInlineSnapshot(`
      "steps:
        - plugins:
            - docker-compose#v5.10.0:
                dependencies: false
                environment:
                  - GITHUB_API_TOKEN
                mount-buildkite-agent: true
      "
    `);
  });

  it('should handle multiple files and plugins', async () => {
    vol.fromJSON({
      'docker-compose.yml': DOCKER_COMPOSE,
      '.buildkite/pipeline.yml': PIPELINE,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const json = volToJson();
    expect(json['docker-compose.yml']).not.toContain(
      '/usr/bin/buildkite-agent:/usr/bin/buildkite-agent',
    );
    expect(json['.buildkite/pipeline.yml']).toContain(
      'mount-buildkite-agent: true',
    );
  });

  it('should not add a duplicate mount-buildkite-agent when one already exists', async () => {
    const pipeline = `steps:
  - plugins:
      - docker-compose#v5.10.0:
          environment:
            - GITHUB_API_TOKEN
          mount-buildkite-agent: true
          propagate-environment: true
          run: app
`;

    vol.fromJSON({
      '.buildkite/pipeline.yml': pipeline,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Docker Compose buildkite-agent mounts to migrate',
    } satisfies PatchReturnType);

    const json = volToJson();
    expect(
      json['.buildkite/pipeline.yml']!.match(/mount-buildkite-agent: true/g),
    ).toHaveLength(1);
    expect(json['.buildkite/pipeline.yml']).toEqual(pipeline);
  });

  it('should still remove the docker-compose mount when the pipeline already opts in', async () => {
    vol.fromJSON({
      'docker-compose.yml': DOCKER_COMPOSE,
      '.buildkite/pipeline.yml': `steps:
  - plugins:
      - docker-compose#v5.10.0:
          environment:
            - GITHUB_API_TOKEN
          mount-buildkite-agent: true
          propagate-environment: true
          run: app
`,
    });

    await expect(
      mountBuildkiteAgent({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const json = volToJson();

    // The stale bind mount and its comment are removed from docker-compose.yml.
    expect(json['docker-compose.yml']).not.toContain(
      '/usr/bin/buildkite-agent:/usr/bin/buildkite-agent',
    );
    expect(json['docker-compose.yml']).not.toContain(
      '# Mount agent for Buildkite annotations.',
    );

    // The pipeline already opts in, so it is left untouched (no duplicate).
    expect(
      json['.buildkite/pipeline.yml']!.match(/mount-buildkite-agent: true/g),
    ).toHaveLength(1);
  });
});
