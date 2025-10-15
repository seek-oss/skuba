/* eslint-disable import-x/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import-x/no-duplicates */

// This file is used to test the requireExtensions rule

// eslint-disable-next-line require-extensions/require-extensions
import { test as simpleTest } from './src/simple';
import { test as validSimpleTest } from './src/simple.js';

// eslint-disable-next-line require-extensions/require-index
import { test as indexFileTest } from './src/indexFile';
import { test as validIndexFileTest } from './src/indexFile/index.js';

// eslint-disable-next-line require-extensions/require-index
import { test as indexFileTest2 } from './src/indexFile/';
import { test as validIndexFileTest2 } from './src/indexFile/index.js';

// eslint-disable-next-line require-extensions/require-extensions
import { test as srcTest } from './src/file';
import { test as validSrcTest } from './src/file.js';

// eslint-disable-next-line require-extensions/require-index
import { test as srcIndexFileTest } from '#src/indexFile';
import { test as validSrcIndexFileTest } from '#src/indexFile/index.js';

// eslint-disable-next-line require-extensions/require-extensions
import { test as bothTest } from './src/both';

const asyncFunction = async () => {
  // @ts-expect-error - testing ESLint rule, intentionally missing extension
  const dynamicImportTest = await import('./src/simple'); // eslint-disable-line require-extensions/require-extensions
  const validDynamicImportTest = await import('./src/simple.js');

  // @ts-expect-error - testing ESLint rule, intentionally missing extension
  const indexFileDynamicImportTest = await import('./src/indexFile'); // eslint-disable-line require-extensions/require-index
  const validIndexFileDynamicImportTest = await import(
    './src/indexFile/index.js'
  );

  // @ts-expect-error - testing ESLint rule, intentionally missing extension
  const srcDynamicImportTest = await import('#src/file'); // eslint-disable-line require-extensions/require-extensions
  const validSrcDynamicImportTest = await import('#src/file.js');

  // @ts-expect-error - testing ESLint rule, intentionally missing extension
  const bothDynamicImportTest = await import('./src/both'); // eslint-disable-line require-extensions/require-extensions
};
