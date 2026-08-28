/**
 * @see https://prettier.io/docs/configuration
 * @satisfies {import('prettier').Config}
 */
const config = {
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  plugins: [
    new URL(import.meta.resolve('prettier-plugin-packagejson')).pathname,
  ],
};

export default config;
