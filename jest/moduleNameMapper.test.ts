import { createModuleNameMapper } from './moduleNameMapper';

describe('moduleNameMapper', () => {
  const act = (paths?: Record<string, string[]>, baseUrl?: string) =>
    createModuleNameMapper(() => ({
      compilerOptions: {
        baseUrl,
        paths,
      },
    }));

  it('expands wildcard paths', () =>
    expect(act({ 'src/*': ['src/*'], 'lib/wip/*': ['lib/wip/*'] }))
      .toMatchInlineSnapshot(`
      Object {
        "^lib/wip$": "<rootDir>/lib/wip",
        "^lib/wip/(.*)$": "<rootDir>/lib/wip/$1",
        "^src$": "<rootDir>/src",
        "^src/(.*)$": "<rootDir>/src/$1",
      }
    `));

  it('expands non-wildcard paths', () =>
    expect(act({ cli: ['cli'], 'src/': ['src/'] })).toMatchInlineSnapshot(`
      Object {
        "^cli$": "<rootDir>/cli",
        "^cli/(.*)$": "<rootDir>/cli/$1",
        "^src$": "<rootDir>/src",
        "^src/(.*)$": "<rootDir>/src/$1",
      }
    `));

  it('expands duplicate asymmetric paths', () =>
    expect(
      act({
        jquery: ['node_modules/jquery/dist/jquery'],
        'jquery/*': ['node_modules/jquery/dist/jquery/*'],
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "^jquery$": "<rootDir>/node_modules/jquery/dist/jquery",
        "^jquery/(.*)$": "<rootDir>/node_modules/jquery/dist/jquery/$1",
      }
    `));

  it('respects a base URL', () =>
    expect(act({ cli: ['../cli'], 'app/*': ['app/*'] }, 'src'))
      .toMatchInlineSnapshot(`
      Object {
        "^app$": "<rootDir>/src/app",
        "^app/(.*)$": "<rootDir>/src/app/$1",
        "^cli$": "<rootDir>/cli",
        "^cli/(.*)$": "<rootDir>/cli/$1",
      }
    `));

  it('handles undefined paths', () => expect(act(undefined)).toStrictEqual({}));

  it('handles no paths', () => expect(act({})).toStrictEqual({}));
});
