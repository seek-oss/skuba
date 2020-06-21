module.exports = () => {
  return {
    plugins: [
      'babel-plugin-macros',
      [
        'babel-plugin-module-resolver',
        {
          alias: {
            src: './src',
          },
        },
      ],
    ],
    presets: [
      [
        '@babel/preset-env',
        {
          bugfixes: true,
          targets: {
            node: 'current',
          },
        },
      ],
      [
        '@babel/preset-typescript',
        {
          allowDeclareFields: true,
          allowNamespaces: true,
          onlyRemoveTypeImports: true,
        },
      ],
    ],
  };
};
