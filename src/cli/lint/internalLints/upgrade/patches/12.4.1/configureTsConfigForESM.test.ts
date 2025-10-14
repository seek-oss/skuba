import memfs, { vol } from 'memfs';

import { Git } from '../../../../../../index.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryConfigureTsConfigForESM } from './configureTsConfigForESM.js';

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

describe('tryConfigureTsConfigForESM', () => {
  it('should skip if repository name cannot be determined', async () => {
    jest
      .mocked(Git.getOwnerAndRepo)
      .mockRejectedValue(new Error('no repo found'));

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no repository name found',
    });
  });

  it('should skip if no tsconfig files are found', async () => {
    vol.fromJSON({});

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no valid tsconfig.json files found',
    });
  });

  it('should skip if the root tsconfig is already configured and contains no paths', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          customConditions: ['@seek/test-repo/source'],
        },
      }),
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'lint',
      }),
    ).rejects.toThrow(
      'Custom condition @seek/test-repo/source already exists in tsconfig.json',
    );
  });

  it('should create a new customConditions field in the root tsConfig', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "customConditions": [
            "@seek/test-repo/source"
          ]
        }
      }",
      }
    `);
  });

  it('should add customConditions to the root tsConfig', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          customConditions: ['other'],
        },
      }),
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsconfig.json": "{
        "compilerOptions": {
          "customConditions": [
            "other",
            "@seek/test-repo/source"
          ],
          "module": "ESNext"
        }
      }",
      }
    `);
  });

  it('should remove all "src" imports from tsconfig.json files', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
          },
        },
      }),
      'others/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
            other: ['other'],
          },
        },
      }),
      'variant1/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            './src/*': ['./src/*'],
          },
        },
      }),
      'variant2/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            'src/*': ['src/*'],
          },
        },
      }),
      'variant3/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            'src/*': ['apps/src/*', 'packages/src/*'],
          },
        },
      }),
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "others/tsconfig.json": "{
        "compilerOptions": {
          "paths": {
            "other": [
              "other"
            ]
          },
          "module": "ESNext"
        }
      }",
        "tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "customConditions": [
            "@seek/test-repo/source"
          ]
        }
      }",
        "variant1/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext"
        }
      }",
        "variant2/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext"
        }
      }",
        "variant3/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext"
        }
      }",
      }
    `);
  });

  it('should set rootDir in tsconfigs and imports in adjacent package.json files', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
          },
        },
      }),
      'package.json': JSON.stringify({
        name: 'root-pkg',
        version: '1.0.0',
      }),
      'others/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
            other: ['other'],
          },
        },
      }),
      'others/package.json': JSON.stringify({
        name: 'others-pkg',
        version: '1.0.0',
      }),
      'variant1/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            './src/*': ['./src/*'],
          },
        },
      }),
      'variant1/tsconfig.build.json': JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
        },
        exclude: ['**/__mocks__/**/*', '**/*.test.ts', 'src/testing/**/*'],
        extends: './tsconfig.json',
        include: ['src/**/*'],
      }),
      'variant1/package.json': JSON.stringify({
        name: 'variant1-pkg',
        version: '1.0.0',
      }),
      'variant2/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            'src/*': ['src/*'],
          },
        },
      }),
      'variant2/tsconfig.build.json': JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
        },
        exclude: ['**/__mocks__/**/*', '**/*.test.ts', 'src/testing/**/*'],
        extends: './tsconfig.json',
        include: ['src/**/*'],
      }),
      'variant2/package.json': JSON.stringify({
        name: 'variant2-pkg',
        version: '1.0.0',
      }),
      'variant3/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            'src/*': ['apps/src/*', 'packages/src/*'],
          },
        },
      }),
      'variant3/tsconfig.build.json': JSON.stringify({
        compilerOptions: {
          rootDir: 'src',
        },
        exclude: ['**/__mocks__/**/*', '**/*.test.ts', 'src/testing/**/*'],
        extends: './tsconfig.json',
        include: ['src/**/*'],
      }),
      'variant3/package.json': JSON.stringify({
        name: 'variant3-pkg',
        version: '1.0.0',
      }),
      'variant3/apps/package.json': JSON.stringify({
        name: 'variant3-apps-pkg',
        version: '1.0.0',
      }),
      'variant3/packages/package.json': JSON.stringify({
        name: 'variant3-packages-pkg',
        version: '1.0.0',
      }),
      'unrelated/package.json': JSON.stringify({
        name: 'unrelated-pkg',
        version: '1.0.0',
      }),
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "others/package.json": "{
        "name": "others-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "others/tsconfig.json": "{
        "compilerOptions": {
          "paths": {
            "other": [
              "other"
            ]
          },
          "module": "ESNext",
          "rootDir": "."
        }
      }",
        "package.json": "{
        "name": "root-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "customConditions": [
            "@seek/test-repo/source"
          ],
          "rootDir": "."
        }
      }",
        "unrelated/package.json": "{"name":"unrelated-pkg","version":"1.0.0"}",
        "variant1/package.json": "{
        "name": "variant1-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "variant1/tsconfig.build.json": "{"compilerOptions":{"rootDir":"src"},"exclude":["**/__mocks__/**/*","**/*.test.ts","src/testing/**/*"],"extends":"./tsconfig.json","include":["src/**/*"]}",
        "variant1/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "rootDir": "."
        }
      }",
        "variant2/package.json": "{
        "name": "variant2-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "variant2/tsconfig.build.json": "{"compilerOptions":{"rootDir":"src"},"exclude":["**/__mocks__/**/*","**/*.test.ts","src/testing/**/*"],"extends":"./tsconfig.json","include":["src/**/*"]}",
        "variant2/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "rootDir": "."
        }
      }",
        "variant3/apps/package.json": "{
        "name": "variant3-apps-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "variant3/package.json": "{"name":"variant3-pkg","version":"1.0.0"}",
        "variant3/packages/package.json": "{
        "name": "variant3-packages-pkg",
        "version": "1.0.0",
        "imports": {
          "#src/*": {
            "@seek/test-repo/source": "./src/*",
            "default": "./lib/*"
          }
        }
      }",
        "variant3/tsconfig.build.json": "{"compilerOptions":{"rootDir":"src"},"exclude":["**/__mocks__/**/*","**/*.test.ts","src/testing/**/*"],"extends":"./tsconfig.json","include":["src/**/*"]}",
        "variant3/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext"
        }
      }",
      }
    `);
  });

  it('should add a moduleNameMapper to jest.config.ts files', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
          },
        },
      }),
      'nested/tsconfig.json': JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          paths: {
            src: ['src'],
          },
        },
      }),
      'jest.config.ts': `import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/test\\.ts'],
});
`,
      'modified/jest.config.ts': `import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: {'someMapper': ['<rootDir>/src/someMapper']},
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/test\\.ts'],
});
`,
      'function/jest.config.ts': `import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: getMapper(),
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/test\\.ts'],
});
`,
    });

    await expect(
      tryConfigureTsConfigForESM({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "function/jest.config.ts": "import { Jest } from 'skuba';

      export default Jest.mergePreset({
        coveragePathIgnorePatterns: ['src/testing'],
        coverageThreshold: {
          global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
          },
        },
        moduleNameMapper: {...getMapper(),"^#src/(.*)\\\\.js$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"],"^#src/(.*)$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"]},
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testPathIgnorePatterns: ['/test\\.ts'],
      });
      }",
        "jest.config.ts": "import { Jest } from 'skuba';

      export default Jest.mergePreset({
        moduleNameMapper: {"^#src/(.*)\\\\.js$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"],"^#src/(.*)$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"]},
        coveragePathIgnorePatterns: ['src/testing'],
        coverageThreshold: {
          global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
          },
        },
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testPathIgnorePatterns: ['/test\\.ts'],
      });
      ",
        "modified/jest.config.ts": "import { Jest } from 'skuba';

      export default Jest.mergePreset({
        coveragePathIgnorePatterns: ['src/testing'],
        coverageThreshold: {
          global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
          },
        },
        moduleNameMapper: {'someMapper': ['<rootDir>/src/someMapper'],"^#src/(.*)\\\\.js$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"],"^#src/(.*)$":["<rootDir>/src/$1","<rootDir>/nested/src/$1"]},
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testPathIgnorePatterns: ['/test\\.ts'],
      });
      ",
        "nested/tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext"
        }
      }",
        "tsconfig.json": "{
        "compilerOptions": {
          "module": "ESNext",
          "customConditions": [
            "@seek/test-repo/source"
          ]
        }
      }",
      }
    `);
  });
});
