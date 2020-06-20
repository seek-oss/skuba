module.exports = () => {
  return {
    plugins: [
      [
        'module-resolver',
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
