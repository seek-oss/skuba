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
      Object {
        "dependencies": Object {
          "a": "0.0.1",
          "b": "0.0.1",
          "c": "0.0.1",
        },
        "devDependencies": Object {
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
      Object {
        "dependencies": Object {
          "a": "0.0.1",
          "c": "0.0.1",
        },
        "devDependencies": Object {
          "a": "0.0.1",
          "b": "0.0.1",
          "c": "0.0.1",
        },
      }
    `));
});

describe('withPackage', () => {
  it('applies function', () =>
    expect(
      withPackage((data) => {
        data.$name = 'unit-test';

        return data;
      })('{}'),
    ).toMatchInlineSnapshot(`
      "{
        \\"$name\\": \\"unit-test\\"
      }
      "
    `));

  it('preserves legitimate fields', () =>
    expect(
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
    ).toMatchInlineSnapshot(`
      "{
        \\"name\\": \\"my-package\\",
        \\"version\\": \\"0.1.0\\",
        \\"description\\": \\"My Package\\",
        \\"$name\\": \\"unit-test\\",
        \\"readme\\": \\"https://github.com/my-org/my-package#readme\\"
      }
      "
    `));

  it('sorts fields', () =>
    expect(
      withPackage((data) => data)(
        JSON.stringify({
          devDependencies: {
            c: '3',
            e: '5',
            d: '4',
          },
          dependencies: {
            b: '2',
            a: '1',
          },
          scripts: {
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
    ).toMatchInlineSnapshot(`
      "{
        \\"files\\": [
          \\"b\\",
          \\"a\\"
        ],
        \\"scripts\\": {
          \\"prebuild\\": \\"rm -rf system32\\",
          \\"build\\": \\"npm install freebsd\\"
        },
        \\"dependencies\\": {
          \\"a\\": \\"1\\",
          \\"b\\": \\"2\\"
        },
        \\"devDependencies\\": {
          \\"c\\": \\"3\\",
          \\"d\\": \\"4\\",
          \\"e\\": \\"5\\"
        },
        \\"skuba\\": {
          \\"version\\": \\"1.0.0\\",
          \\"type\\": \\"application\\"
        }
      }
      "
    `));

  it('handles bad JSON gracefully', () =>
    expect(
      withPackage((data) => {
        data.$name = 'unit-test';

        return data;
      })('}'),
    ).toMatchInlineSnapshot(`
      "{
        \\"$name\\": \\"unit-test\\"
      }
      "
    `));
});
