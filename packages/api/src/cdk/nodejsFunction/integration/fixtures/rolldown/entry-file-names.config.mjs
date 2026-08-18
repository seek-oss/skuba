export default {
  output: {
    format: 'es',
    entryFileNames: 'custom.mjs',
  },
  external: [/^node:/],
};
