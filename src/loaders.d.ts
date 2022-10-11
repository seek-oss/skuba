// N.B. these interoperate with `esbuild` but not with plain `tsc`.

declare module '*.gql' {
  const text: string;

  export default text;
}

declare module '*.graphql' {
  const text: string;

  export default text;
}

declare module '*.sql' {
  const text: string;

  export default text;
}
