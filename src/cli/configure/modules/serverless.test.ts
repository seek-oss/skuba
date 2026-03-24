import { describe, expect, it } from 'vitest';

import { defaultOpts, executeModule } from '../testing/module.js';

import { serverlessModule } from './serverless.js';

describe('serverlessModule', () => {
  it('does not touch empty input', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      serverlessModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles).toEqual({});
  });

  it('rewires a variety of patterns', async () => {
    const INPUT_SERVERLESS_YAML = `
      service: unrelated-dist-reference

      package:
        include:
          - dist/**

      package:
        include:
          - /dist/**

      package:
        include:
          - ./dist/**

      functions:
        WorkerA:
          handler: dist/app.aHandler
        WorkerB:
          handler: /dist/app.bHandler
        WorkerC:
          handler: ./dist/app.cHandler
    `;

    const EXPECTED_SERVERLESS_YAML = `
      service: unrelated-dist-reference

      package:
        include:
          - lib/**

      package:
        include:
          - lib/**

      package:
        include:
          - lib/**

      functions:
        WorkerA:
          handler: lib/app.aHandler
        WorkerB:
          handler: lib/app.bHandler
        WorkerC:
          handler: lib/app.cHandler
    `;

    const inputFiles = {
      'serverless.yml': INPUT_SERVERLESS_YAML,
    };

    const outputFiles = await executeModule(
      serverlessModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles).toEqual({
      'serverless.yml': EXPECTED_SERVERLESS_YAML,
    });
  });

  it('rewires a variety of Serverless files', async () => {
    const INPUT_SERVERLESS_YAML = `
      package:
        include:
          - dist/**

      functions:
        Worker:
          handler: dist/app.handler
    `;

    const EXPECTED_SERVERLESS_YAML = `
      package:
        include:
          - lib/**

      functions:
        Worker:
          handler: lib/app.handler
    `;

    const inputFiles = {
      'serverless.yml': INPUT_SERVERLESS_YAML,
      'serverless.service.yml': INPUT_SERVERLESS_YAML,
      'service/serverless.yml': INPUT_SERVERLESS_YAML,
      'unrelated.txt': 'dist',
    };

    const outputFiles = await executeModule(
      serverlessModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles).toEqual({
      'serverless.yml': EXPECTED_SERVERLESS_YAML,
      'serverless.service.yml': EXPECTED_SERVERLESS_YAML,
      'service/serverless.yml': EXPECTED_SERVERLESS_YAML,
      'unrelated.txt': 'dist',
    });
  });
});
