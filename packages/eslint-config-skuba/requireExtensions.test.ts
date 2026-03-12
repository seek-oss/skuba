/* eslint-disable import-x/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import-x/no-duplicates */

// This file is used to test the requireExtensions rule (rules disabled via eslint.config.js)

import { test as simpleTest } from './src/simple.js';
import { test as validSimpleTest } from './src/simple.js';

import { test as indexFileTest } from './src/indexFile/index.js';
import { test as validIndexFileTest } from './src/indexFile/index.js';

import { test as indexFileTest2 } from './src/indexFile/index.js';
import { test as validIndexFileTest2 } from './src/indexFile/index.js';

import { test as srcTest } from './src/file.js';
import { test as validSrcTest } from './src/file.js';

import { test as srcIndexFileTest } from 'src/indexFile/index.js';
import { test as validSrcIndexFileTest } from 'src/indexFile/index.js';

import { test as bothTest } from './src/both.js';

const asyncFunction = async () => {
  const dynamicImportTest = await import('./src/simple.js');
  const validDynamicImportTest = await import('./src/simple.js');

  const indexFileDynamicImportTest = await import('./src/indexFile/index.js');
  const validIndexFileDynamicImportTest =
    await import('./src/indexFile/index.js');

  const srcDynamicImportTest = await import('src/file.js');
  const validSrcDynamicImportTest = await import('src/file.js');

  const bothDynamicImportTest = await import('./src/both.js');
};
