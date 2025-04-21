import * as config from '.';

describe('config', () => {
  it('exports', () => {
    expect(config).toMatchInlineSnapshot(`
      {
        "SkubaConfig": {
          "assets": {
            "default": [
              "**/*.vocab/*translations.json",
            ],
          },
        },
      }
    `);
  });
});
