export default {
  output: {
    format: 'es',
    chunkFileNames: 'index.mjs',
  },
  external: [/^node:/],
};
