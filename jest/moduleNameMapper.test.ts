import { createModuleNameMapper } from './moduleNameMapper.js';

describe('moduleNameMapper', () => {
  const act = (paths?: unknown, baseUrl?: string) =>
    createModuleNameMapper(() => ({
      compilerOptions: {
        baseUrl,
        paths,
      },
    }));

  it('expands wildcard paths', () =>
    expect(act({ 'src/*': ['src/*'], 'lib/wip/*': ['lib/wip/*'] }))
      .toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
        "^lib/wip$": "<rootDir>/lib/wip",
        "^lib/wip/(.*)$": "<rootDir>/lib/wip/$1",
        "^lib/wip/(.*)\\.js$": "<rootDir>/lib/wip/$1",
        "^src$": "<rootDir>/src",
        "^src/(.*)$": "<rootDir>/src/$1",
        "^src/(.*)\\.js$": "<rootDir>/src/$1",
      }
    `));

  it('expands non-wildcard paths', () =>
    expect(act({ cli: ['cli'], 'src/': ['src/'] })).toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
        "^cli$": "<rootDir>/cli",
        "^cli/(.*)$": "<rootDir>/cli/$1",
        "^cli/(.*)\\.js$": "<rootDir>/cli/$1",
        "^src$": "<rootDir>/src",
        "^src/(.*)$": "<rootDir>/src/$1",
        "^src/(.*)\\.js$": "<rootDir>/src/$1",
      }
    `));

  it('expands duplicate asymmetric paths', () =>
    expect(
      act({
        jquery: ['node_modules/jquery/dist/jquery'],
        'jquery/*': ['node_modules/jquery/dist/jquery/*'],
      }),
    ).toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
        "^jquery$": "<rootDir>/node_modules/jquery/dist/jquery",
        "^jquery/(.*)$": "<rootDir>/node_modules/jquery/dist/jquery/$1",
        "^jquery/(.*)\\.js$": "<rootDir>/node_modules/jquery/dist/jquery/$1",
      }
    `));

  it('respects a base URL', () =>
    expect(act({ cli: ['../cli'], 'app/*': ['app/*'] }, 'src'))
      .toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
        "^app$": "<rootDir>/src/app",
        "^app/(.*)$": "<rootDir>/src/app/$1",
        "^app/(.*)\\.js$": "<rootDir>/src/app/$1",
        "^cli$": "<rootDir>/cli",
        "^cli/(.*)$": "<rootDir>/cli/$1",
        "^cli/(.*)\\.js$": "<rootDir>/cli/$1",
      }
    `));

  it('respects no paths', () =>
    expect(act({})).toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
      }
    `));

  it('defaults to a single path on undefined', () =>
    expect(act(undefined)).toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
      }
    `));

  it('defaults to a single path on invalid config', () =>
    expect(act('INVALID')).toMatchInlineSnapshot(`
      {
        "^(\\.{1,2}/.*)\\.js$": [
          "$1",
          "$1.js",
        ],
      }
    `));
});
