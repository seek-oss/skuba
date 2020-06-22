import { Snippet } from 'enquirer';

import { getPresets } from './presets';

type Field = {
  name: string;
  message?: string;
  initial?: string;
  validate?: (
    values: Record<string, string>,
  ) => boolean | string | Promise<boolean | string>;
};

type Options = {
  name: string;
  message: string;
  fields: ReadonlyArray<Field>;
  required?: boolean;
  template: string;
};

export const run = async <T extends Record<string, string>>(
  opts: Options,
): Promise<{ result: string; values: T }> => {
  const presets = (await getPresets()) || {};

  const presetValues: Record<string, string> = {};
  const filteredSnippet: Record<string, Field> = {};

  for (const field of opts.fields) {
    const key = field.name;
    if (key in presets) {
      // TODO: validate preset value
      presetValues[key] = presets[key];
    } else {
      filteredSnippet[key] = field;
    }
  }

  const { result, values: userInputValues } = await new Snippet<Partial<T>>(
    opts,
  ).run();

  return { result, values: { ...presetValues, ...userInputValues } as T };
};
