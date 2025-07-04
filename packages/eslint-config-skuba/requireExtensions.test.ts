/* eslint-disable import-x/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import-x/no-duplicates */

// This file is used to test the requireExtensions rule

// eslint-disable-next-line require-extensions/require-extensions
import { test as simpleTest } from './test/simple';
import { test as validSimpleTest } from './test/simple.js';

// eslint-disable-next-line require-extensions/require-index
import { test as indexFileTest } from './test/indexFile';
import { test as validIndexFileTest } from './test/indexFile/index.js';

// eslint-disable-next-line require-extensions/require-extensions
import { test as srcTest } from 'src/file';
import { test as validSrcTest } from 'src/file.js';

// eslint-disable-next-line require-extensions/require-extensions, require-extensions/require-index
import { test as bothTest } from './test/both';
