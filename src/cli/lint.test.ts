import { internalLint } from './lint';

describe('internalLint', () => {
  it('passes on skuba itself', () =>
    expect(internalLint()).resolves.toBeUndefined());
});

/**
 * Ensure compatibility between our lint command and new syntax features.
 */
describe('TypeScript', () => {
  describe('4.0', () => {
    test('Variadic Tuple Types', () => {
      type Strings = [string, string];
      type Numbers = [number, number];
      type StrStrNumNumBool = [...Strings, ...Numbers, boolean];

      const strStrNumNumBool: StrStrNumNumBool = ['', '', 0, 0, true];

      expect(strStrNumNumBool).toBeDefined();
    });

    test('Labeled Tuple Elements', () => {
      type Foo = [first: number, second?: string, ...rest: unknown[]];

      const foo: Foo = [1, , null, {}];

      expect(foo).toBeDefined();
    });

    test('Short-Circuiting Assignment Operators', () => {
      let a = 1;
      const b = 1;

      a += b;
      a -= b;
      a *= b;
      a /= b;
      a **= b;
      a <<= b;

      expect(a).toBeDefined();
    });

    test('unknown on catch Clause Bindings', () => {
      try {
      } catch (err: unknown) {}
    });
  });

  describe('4.1', () => {
    test('Template Literal Types', () => {
      type Color = 'red' | 'blue';
      type Quantity = 'one' | 'two';
      type SeussFish = `${Quantity | Color} fish`;

      const seussFish: SeussFish = 'red fish';

      expect(seussFish).toBeDefined();
    });

    test('Key Remapping in Mapped Types', () => {
      type RemoveKindField<T> = {
        [K in keyof T as Exclude<K, 'kind'>]: T[K];
      };
      interface Circle {
        kind: 'circle';
        radius: number;
      }
      type KindlessCircle = RemoveKindField<Circle>;

      const kindlessCircle: KindlessCircle = {
        radius: 0,
      };

      expect(kindlessCircle).toBeDefined();
    });
  });
});
