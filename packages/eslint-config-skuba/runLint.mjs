/* eslint-disable no-console */
import { loadESLint } from 'eslint';

const ESLint = await loadESLint({ useFlatConfig: true });
const engine = new ESLint({
  cache: true,
  fix: false,
  overrideConfig: {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
});

const results = await engine.lintFiles(['.']);

for (const result of results) {
  for (const message of result.messages) {
    console.log(
      `${result.filePath}:${message.line}:${message.column} ${message.message}`,
    );
  }
}

const errorCount = results.reduce(
  (count, result) => count + result.errorCount,
  0,
);

const warningCount = results.reduce(
  (count, result) => count + result.warningCount,
  0,
);

console.log(`\n${errorCount} error(s), ${warningCount} warning(s)\n`);
