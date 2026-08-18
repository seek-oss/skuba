export default {
  output: {
    format: 'es',
    file: 'bundle.mjs',
  },
  external: [/^node:/],
};
