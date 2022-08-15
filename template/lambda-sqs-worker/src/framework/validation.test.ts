import {
  chance,
  filterIdDescription,
  mockIdDescription,
} from 'src/testing/types';

import { validateJson } from './validation';

describe('validateJson', () => {
  const idDescription = mockIdDescription();

  it('permits valid input', () => {
    const input = JSON.stringify(idDescription);

    expect(validateJson(input, filterIdDescription)).toStrictEqual(
      idDescription,
    );
  });

  it('filters additional properties', () => {
    const input = JSON.stringify({ ...idDescription, hacker: chance.name() });

    expect(validateJson(input, filterIdDescription)).toStrictEqual(
      idDescription,
    );
  });

  it('blocks mistyped prop', () => {
    const input = JSON.stringify({ ...idDescription, id: null });

    expect(() => validateJson(input, filterIdDescription))
      .toThrowErrorMatchingInlineSnapshot(`
      "Validation failed:
      {
        \\"id\\": \\"Expected string, but was null\\"
      }.
      Object should match { id: string; description: string; }"
    `);
  });

  it('blocks missing prop', () => {
    const input = '{}';

    expect(() => validateJson(input, filterIdDescription))
      .toThrowErrorMatchingInlineSnapshot(`
      "Validation failed:
      {
        \\"id\\": \\"Expected string, but was missing\\",
        \\"description\\": \\"Expected string, but was missing\\"
      }.
      Object should match { id: string; description: string; }"
    `);
  });

  it('blocks invalid JSON', () => {
    const input = '}';

    expect(() =>
      validateJson(input, filterIdDescription),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unexpected token } in JSON at position 0"`,
    );
  });
});
