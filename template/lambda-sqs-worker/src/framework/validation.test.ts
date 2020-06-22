import { IdDescription, chance, mockIdDescription } from 'src/testing/types';

import { validateJson } from './validation';

describe('validateJson', () => {
  const idDescription = mockIdDescription();

  it('permits valid input', () => {
    const input = JSON.stringify(idDescription);

    expect(validateJson(input, IdDescription)).toStrictEqual(idDescription);
  });

  it('filters additional properties', () => {
    const input = JSON.stringify({ ...idDescription, hacker: chance.name() });

    expect(validateJson(input, IdDescription)).toStrictEqual(idDescription);
  });

  it('blocks mistyped prop', () => {
    const input = JSON.stringify({ ...idDescription, id: null });

    expect(() =>
      validateJson(input, IdDescription),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected string, but was null in id"`,
    );
  });

  it('blocks missing prop', () => {
    const input = '{}';

    expect(() =>
      validateJson(input, IdDescription),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected string, but was undefined in id"`,
    );
  });

  it('blocks invalid JSON', () => {
    const input = '}';

    expect(() =>
      validateJson(input, IdDescription),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unexpected token } in JSON at position 0"`,
    );
  });
});
