/* eslint-disable import-x/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import-x/no-duplicates */

// This file is used to test the requireExtensions rule

// eslint-disable-next-line require-extensions/require-extensions
import { test as simpleTest } from './simple';
import { test as validSimpleTest } from './simple.js';

// eslint-disable-next-line require-extensions/require-index
import { test as indexFileTest } from './indexFile';
import { test as validIndexFileTest } from './indexFile/index.js';

// eslint-disable-next-line require-extensions/require-extensions
import { test as srcTest } from 'src/file';
import { test as validSrcTest } from 'src/file.js';

// eslint-disable-next-line require-extensions/require-index
import { test as srcIndexFileTest } from 'src/indexFile';
import { test as validSrcIndexFileTest } from 'src/indexFile/index.js';

// eslint-disable-next-line require-extensions/require-extensions
import { test as bothTest } from './both';

// eslint-disable-next-line require-extensions/require-index
import '.';
import './index.js';

// eslint-disable-next-line require-extensions/require-index
import '..';
import '../index.js';

// eslint-disable-next-line require-extensions/require-index
import '../';
import '../index.js';

const asyncFunction = async () => {
  const dynamicImportTest = await import('./simple.js');
  const validDynamicImportTest = await import('./simple.js');

  const indexFileDynamicImportTest = await import('./indexFile/index.js');
  const validIndexFileDynamicImportTest = await import('./indexFile/index.js');

  const srcDynamicImportTest = await import('src/file.js');
  const validSrcDynamicImportTest = await import('src/file.js');

  const bothDynamicImportTest = await import('./both/index.js');
};
