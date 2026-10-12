import type { Choice } from './prompts.js';

/**
 * Template fields that name the project itself rather than its repository.
 *
 * Templates predate the workspace flow and ask for this under their own name;
 * services call it `serviceName` while packages call it `moduleName`.
 */
const PROJECT_NAME_FIELDS = new Set(['serviceName', 'moduleName']);

interface SeededFields {
  /** Fields that still need to be prompted for. */
  fields: Choice[];

  /** Answers supplied from the project name. */
  answers: Record<string, string>;
}

// Mirrors `toClackValidate`, where a string is an error message and a missing
// result is a pass.
const isValid = (choice: Choice, value: string) => {
  const result = choice.validate?.(value);

  return typeof result !== 'string' && result !== false;
};

/**
 * Answers a template's project name field from the workspace `projectName`.
 *
 * A workspace has already prompted for the project's name, so asking for it
 * again under the template's own name is redundant. The prompt is only dropped
 * when the project name satisfies the template's own validation; a template
 * like `private-npm-package` wants a scoped `@seek/` name, so there the value
 * seeds the prompt instead of replacing it.
 */
export const seedProjectName = (
  fields: readonly Choice[],
  projectName: string,
): SeededFields =>
  fields.reduce<SeededFields>(
    (seeded, field) => {
      if (!PROJECT_NAME_FIELDS.has(field.name)) {
        seeded.fields.push(field);
      } else if (isValid(field, projectName)) {
        seeded.answers[field.name] = projectName;
      } else {
        seeded.fields.push({ ...field, initialValue: projectName });
      }

      return seeded;
    },
    { fields: [], answers: {} },
  );
