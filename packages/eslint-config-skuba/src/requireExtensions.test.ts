/* eslint-disable import-x/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import-x/no-duplicates */

// This file is used to test the requireExtensions rule (rules disabled via eslint.config.js)

import { test as simpleTest } from './simple.js';
import { test as validSimpleTest } from './simple.js';

import { test as indexFileTest } from './indexFile/index.js';
import { test as validIndexFileTest } from './indexFile/index.js';

import { test as srcTest } from 'src/file.js';
import { test as validSrcTest } from 'src/file.js';

import { test as srcIndexFileTest } from 'src/indexFile/index.js';
import { test as validSrcIndexFileTest } from 'src/indexFile/index.js';

import { test as bothTest } from './both.js';

import './index.js';
import './index.js';

import '../index.js';
import '../index.js';

import '../index.js';
import '../index.js';

const asyncFunction = async () => {
  const dynamicImportTest = await import('./simple.js');
  const validDynamicImportTest = await import('./simple.js');

  const indexFileDynamicImportTest = await import('./indexFile/index.js');
  const validIndexFileDynamicImportTest = await import('./indexFile/index.js');

  const srcDynamicImportTest = await import('src/file.js');
  const validSrcDynamicImportTest = await import('src/file.js');

  const bothDynamicImportTest = await import('./both.js');
};
