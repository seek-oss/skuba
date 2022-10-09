import {
  IdDescriptionSchema,
  chance,
  mockIdDescription,
} from 'src/testing/types';

import { validateJson } from './validation';

describe('validateJson', () => {
  const idDescription = mockIdDescription();

  it('permits valid input', () => {
    const input = JSON.stringify(idDescription);

    expect(validateJson(input, IdDescriptionSchema)).toStrictEqual(
      idDescription,
    );
  });

  it('filters additional properties', () => {
    const input = JSON.stringify({ ...idDescription, hacker: chance.name() });

    expect(validateJson(input, IdDescriptionSchema)).toStrictEqual(
      idDescription,
    );
  });

  it('blocks mistyped prop', () => {
    const input = JSON.stringify({ ...idDescription, id: null });

    expect(() => validateJson(input, IdDescriptionSchema))
      .toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "null",
          "path": [
            "id"
          ],
          "message": "Expected string, received null"
        }
      ]"
    `);
  });

  it('blocks missing prop', () => {
    const input = '{}';

    expect(() => validateJson(input, IdDescriptionSchema))
      .toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": [
            "id"
          ],
          "message": "Required"
        },
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": [
            "description"
          ],
          "message": "Required"
        }
      ]"
    `);
  });

  it('blocks invalid JSON', () => {
    const input = '}';

    expect(() =>
      validateJson(input, IdDescriptionSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unexpected token } in JSON at position 0"`,
    );
  });
});
