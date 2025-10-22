import { describe, expect, it } from 'vitest';

import { md } from './md.js';

describe('terminal', () => {
  it.each`
    description        | code
    ${'harmless code'} | ${'echo foo'}
    ${'1 backtick'}    | ${'`echo foo`'}
    ${'3 backticks'}   | ${'```echo foo```'}
    ${'6 backticks'}   | ${'``````'}
  `('handles $description', ({ code }) =>
    expect(md.terminal(code)).toMatchSnapshot(),
  );
});
