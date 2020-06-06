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
          name: 'my-package',
          readme: 'https://github.com/my-org/my-package#readme',
          version: '0.1.0',
        }),
      ),
    ).toMatchInlineSnapshot(`
      "{
        \\"$name\\": \\"unit-test\\",
        \\"description\\": \\"My Package\\",
        \\"name\\": \\"my-package\\",
        \\"readme\\": \\"https://github.com/my-org/my-package#readme\\",
        \\"version\\": \\"0.1.0\\"
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
