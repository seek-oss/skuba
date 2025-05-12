import { createDependencyFilter, withPackage } from './package';

describe('createDependencyFilter', () => {
  it('can filter dependencies', () =>
    expect(
      createDependencyFilter(
        ['c', 'a'],
        'devDependencies',
      )({
        dependencies: {
          a: '0.0.1',
          b: '0.0.1',
          c: '0.0.1',
        },

        devDependencies: {
          a: '0.0.1',
          b: '0.0.1',
          c: '0.0.1',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "dependencies": {
          "a": "0.0.1",
          "b": "0.0.1",
          "c": "0.0.1",
        },
        "devDependencies": {
          "b": "0.0.1",
        },
      }
    `));

  it('can filter dev dependencies', () =>
    expect(
      createDependencyFilter(
        ['b'],
        'dependencies',
      )({
        dependencies: {
          a: '0.0.1',
          b: '0.0.1',
          c: '0.0.1',
        },

        devDependencies: {
          a: '0.0.1',
          b: '0.0.1',
          c: '0.0.1',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "dependencies": {
          "a": "0.0.1",
          "c": "0.0.1",
        },
        "devDependencies": {
          "a": "0.0.1",
          "b": "0.0.1",
          "c": "0.0.1",
        },
      }
    `));
});

describe('withPackage', () => {
  it('applies function', async () =>
    await expect(
      withPackage((data) => {
        data.$name = 'unit-test';

        return data;
      })('{}'),
    ).resolves.toMatchInlineSnapshot(`
      "{
        "$name": "unit-test"
      }
      "
    `));

  it('preserves legitimate fields', async () =>
    await expect(
      withPackage((data) => {
        data.$name = 'unit-test';

        return data;
      })(
        JSON.stringify({
          description: 'My Package',
          readme: 'https://github.com/my-org/my-package#readme',
          version: '0.1.0',
          name: 'my-package',
        }),
      ),
    ).resolves.toMatchInlineSnapshot(`
"{
  "name": "my-package",
  "version": "0.1.0",
  "description": "My Package",
  "$name": "unit-test",
  "readme": "https://github.com/my-org/my-package#readme"
}
"
`));

  it('sorts fields', async () =>
    await expect(
      withPackage((data) => data)(
        JSON.stringify({
          devDependencies: {
            c: '3',
            e: '5',
            d: '4',
            '@types/koa-bodyparser': '^5.0.2',
            '@types/koa__router': '^8.0.8',
            '@types/koa': '^2.13.4',
          },

          dependencies: {
            b: '2',
            a: '1',
          },

          scripts: {
            lint: 'echo Linting',
            prelint: 'echo Prepare for lint-off',
            prebuild: 'rm -rf system32',
            build: 'npm install freebsd',
          },

          skuba: {
            version: '1.0.0',
            type: 'application',
          },

          files: ['b', 'a'],
        }),
      ),
    ).resolves.toMatchInlineSnapshot(`
"{
  "files": [
    "b",
    "a"
  ],
  "scripts": {
    "prebuild": "rm -rf system32",
    "build": "npm install freebsd",
    "prelint": "echo Prepare for lint-off",
    "lint": "echo Linting"
  },
  "dependencies": {
    "a": "1",
    "b": "2"
  },
  "devDependencies": {
    "@types/koa": "^2.13.4",
    "@types/koa__router": "^8.0.8",
    "@types/koa-bodyparser": "^5.0.2",
    "c": "3",
    "d": "4",
    "e": "5"
  },
  "skuba": {
    "version": "1.0.0",
    "type": "application"
  }
}
"
`));

  it('handles bad JSON gracefully', async () =>
    await expect(
      withPackage((data) => {
        data.$name = 'unit-test';

        return data;
      })('}'),
    ).resolves.toMatchInlineSnapshot(`
      "{
        "$name": "unit-test"
      }
      "
    `));
});
