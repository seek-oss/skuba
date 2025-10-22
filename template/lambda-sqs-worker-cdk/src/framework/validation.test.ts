import { describe, expect, it } from 'vitest';
import { validateJson } from './validation.js';

import {
  IdDescriptionSchema,
  chance,
  mockIdDescription,
} from '#src/testing/types.js';

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
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "id"
          ],
          "message": "Invalid input: expected string, received null"
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
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "id"
          ],
          "message": "Invalid input: expected string, received undefined"
        },
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "description"
          ],
          "message": "Invalid input: expected string, received undefined"
        }
      ]"
    `);
  });

  it('blocks invalid JSON', () => {
    const input = '}';

    expect(() =>
      validateJson(input, IdDescriptionSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unexpected token '}', "}" is not valid JSON"`,
    );
  });
});
