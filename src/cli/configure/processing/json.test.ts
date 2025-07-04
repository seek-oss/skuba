import { formatObject, parseObject } from './json.js';

describe('formatObject', () => {
  it('sorts and formats', async () =>
    await expect(
      formatObject({
        b: 1,
        a: null,
        c: [],
      }),
    ).resolves.toMatchInlineSnapshot(`
      "{
        "a": null,
        "b": 1,
        "c": []
      }
      "
    `));

  it('handles ordinary JSON array formatting', async () =>
    await expect(formatObject({ files: ['1', '2', '3'] })).resolves
      .toMatchInlineSnapshot(`
      "{
        "files": ["1", "2", "3"]
      }
      "
    `));

  it('handles special-cased package.json array formatting', async () =>
    await expect(formatObject({ files: ['1', '2', '3'] }, 'package.json'))
      .resolves.toMatchInlineSnapshot(`
      "{
        "files": [
          "1",
          "2",
          "3"
        ]
      }
      "
    `));
});

describe('parseObject', () => {
  it('passes through undefined', () =>
    expect(parseObject(undefined)).toBeUndefined());

  it('invalidates bad JSON', () => expect(parseObject('}')).toBeUndefined());

  it('invalidates null', () => expect(parseObject('null')).toBeUndefined());

  it('invalidates primitive', () => expect(parseObject('1')).toBeUndefined());

  it('parses object', () =>
    expect(parseObject('{"a": null}')).toStrictEqual({ a: null }));
});
