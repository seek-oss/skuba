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
        "^lib/wip$": "<rootDir>/lib/wip",
        "^lib/wip/(.*)$": "<rootDir>/lib/wip/$1",
        "^src$": "<rootDir>/src",
        "^src/(.*)$": "<rootDir>/src/$1",
      }
    `));

  it('expands non-wildcard paths', () =>
    expect(act({ cli: ['cli'], 'src/': ['src/'] })).toMatchInlineSnapshot(`
      {
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
      {
        "^jquery$": "<rootDir>/node_modules/jquery/dist/jquery",
        "^jquery/(.*)$": "<rootDir>/node_modules/jquery/dist/jquery/$1",
      }
    `));

  it('respects a base URL', () =>
    expect(act({ cli: ['../cli'], 'app/*': ['app/*'] }, 'src'))
      .toMatchInlineSnapshot(`
      {
        "^app$": "<rootDir>/src/app",
        "^app/(.*)$": "<rootDir>/src/app/$1",
        "^cli$": "<rootDir>/cli",
        "^cli/(.*)$": "<rootDir>/cli/$1",
      }
    `));

  it('respects no paths', () => expect(act({})).toMatchInlineSnapshot(`{}`));

  it('defaults to no paths on undefined', () =>
    expect(act(undefined)).toMatchInlineSnapshot(`{}`));

  it('defaults to no paths on invalid config', () =>
    expect(act('INVALID')).toMatchInlineSnapshot(`{}`));
});
