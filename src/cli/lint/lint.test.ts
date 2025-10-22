import { describe, expect, test } from 'vitest';
// Uncomment the following line when there's an intentionally skipped test.
// /* eslint-disable jest/no-disabled-tests */

import './index.js';

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err: unknown) {}
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

  describe('4.2', () => {
    test('Leading Rest Elements in Tuple Types', () => {
      type Tuple = [...string[], number];

      const tuple: Tuple = ['', '', '', 0];

      expect(tuple).toBeDefined();
    });

    test('Middle Rest Elements in Tuple Types', () => {
      type Tuple = [boolean, ...string[], boolean];

      const tuple: Tuple = [true, '', '', '', false];

      expect(tuple).toBeDefined();
    });

    test('Stricter Checks For The in Operator', () => {
      const flag = true;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(flag ? true : 'foo' in 42).toBeDefined();
    });

    test('abstract Construct Signatures', () => {
      abstract class Shape {
        abstract getArea(): number;
      }

      class Square extends Shape {
        getArea(): number {
          return 0;
        }
      }

      interface HasArea {
        getArea(): number;
      }

      const Ctor: abstract new () => HasArea = Square;

      expect(Ctor).toBeDefined();
    });
  });

  describe('4.3', () => {
    test('Separate Write Types of Properties', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      interface Thing {
        // get size(): number
        // set size(value: number | string | boolean);
      }

      expect(true as unknown as Thing).toBeDefined();
    });

    test('override and the --noImplicitOverride flag', () => {
      class SomeComponent {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        show() {}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        hide() {}
      }

      class SpecializedComponent extends SomeComponent {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        override show() {}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        override hide() {}
      }

      expect(SpecializedComponent).toBeDefined();
    });

    /**
     * Not yet supported by ESLint, but this appears to pass linting rather than
     * fail.
     *
     * {@link https://github.com/typescript-eslint/typescript-eslint/issues/3430}
     */
    test('ECMAScript #private Class Elements', () => {
      class Foo {
        #someMethod() {
          return 1;
        }

        // eslint-disable-next-line @typescript-eslint/class-literal-property-style, no-restricted-syntax
        get #someValue() {
          return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        static #someStaticMethod() {}

        somePublicMethod() {
          this.#someMethod();
          Foo.#someStaticMethod();
          return this.#someValue;
        }
      }

      expect(Foo).toBeDefined();
    });

    test('static Index Signatures', () => {
      class Foo {
        static hello = 'hello';
        static world = 1234;

        static [propName: string]: string | number | undefined;
      }

      expect(Foo).toBeDefined();
    });
  });
});
