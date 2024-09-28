declare module '@eslint/migrate-config/src/migrate-config.js' {
  // incomplete types for upgradeESLint.ts
  export function migrateConfig(
    config: { ignorePatterns: string[] },
    opts: { sourceType: 'commonjs' | 'module'; gitignore?: boolean },
  ): string;
}
