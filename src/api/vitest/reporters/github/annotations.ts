import path from 'path';
import { stripVTControlCharacters as stripAnsi } from 'util';

import type {
  SerializedError,
  TestModule,
  TestProject,
  Vitest,
} from 'vitest/node';

import type * as GitHub from '@skuba-lib/api/github';

const createAnnotation = ({
  ctx,
  error,
  moduleId,
  project,
}: {
  ctx: Vitest;
  error: unknown;
  /**
   * Module that the error is attributed to.
   *
   * This is absent for unhandled errors, which are not tied to a test module.
   */
  moduleId?: string;
  project: TestProject;
}): GitHub.Annotation[] => {
  const { nearest, output } = ctx.logger.formatError(error, { project });

  // Without a stack location or an owning module, there is nowhere to hang the
  // annotation off of in GitHub.
  const file = nearest?.file ?? moduleId;
  if (!file) {
    return [];
  }

  const line = nearest?.line ?? 1;

  return [
    {
      annotation_level: 'failure',
      path: path.relative(process.cwd(), file),
      start_line: line,
      end_line: line,
      // GitHub only accepts columns when the annotation spans a single line.
      ...(nearest && {
        start_column: nearest.column,
        end_column: nearest.column,
      }),
      message: stripAnsi(output),
      title: 'Vitest',
    },
  ];
};

export const createModuleAnnotations = (
  testModule: TestModule,
  ctx: Vitest,
): GitHub.Annotation[] => {
  const { project, moduleId } = testModule;

  // Errors that happened outside of the test run, like syntax errors.
  const collectionAnnotations = testModule
    .errors()
    .flatMap((error) => createAnnotation({ ctx, error, moduleId, project }));

  const testAnnotations = [...testModule.children.allTests('failed')].flatMap(
    (testCase) =>
      (testCase.result().errors ?? []).flatMap((error) =>
        createAnnotation({ ctx, error, moduleId, project }),
      ),
  );

  return [...collectionAnnotations, ...testAnnotations];
};

export const createUnhandledErrorAnnotations = (
  unhandledErrors: readonly SerializedError[],
  ctx: Vitest,
): GitHub.Annotation[] =>
  unhandledErrors.flatMap((error) =>
    createAnnotation({ ctx, error, project: ctx.getRootProject() }),
  );

export interface AnnotationEntry {
  annotations: GitHub.Annotation[];
  /**
   * Vitest project that the annotations belong to.
   *
   * This is `undefined` for the unnamed root project.
   */
  projectName: string | undefined;
  ok: boolean;
}

/**
 * Builds a set of annotations per Vitest project.
 *
 * Grouping by project mirrors the Jest reporter that this replaced, which
 * grouped by display name. A project that ran without failures still yields an
 * entry so that it reports a passing check run.
 */
export const generateAnnotationEntries = ({
  ctx,
  testModules,
  unhandledErrors,
}: {
  ctx: Vitest;
  testModules: readonly TestModule[];
  unhandledErrors: readonly SerializedError[];
}): AnnotationEntry[] => {
  // Unhandled errors are not tied to a project, so they are reported against
  // the unnamed group. Seeding it keeps them visible in a run that comprises
  // named projects only.
  const modulesByProjectName = new Map<string | undefined, TestModule[]>(
    unhandledErrors.length ? [[undefined, []]] : [],
  );

  for (const testModule of testModules) {
    const projectName = testModule.project.name || undefined;

    const modules = modulesByProjectName.get(projectName) ?? [];
    modules.push(testModule);

    modulesByProjectName.set(projectName, modules);
  }

  return [...modulesByProjectName].map(([projectName, modules]) => {
    const isUnnamed = projectName === undefined;

    return {
      annotations: [
        ...(isUnnamed
          ? createUnhandledErrorAnnotations(unhandledErrors, ctx)
          : []),
        ...modules.flatMap((testModule) =>
          createModuleAnnotations(testModule, ctx),
        ),
      ],
      projectName,
      ok:
        modules.every((testModule) => testModule.ok()) &&
        !(isUnnamed && unhandledErrors.length > 0),
    };
  });
};
