// evanw/esbuild#2388

declare global {
  namespace WebAssembly {
    interface Module {}
  }
}

export {};
