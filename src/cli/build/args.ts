import path from 'path';

import minimist from 'minimist';

export const parseTscArgs = (args: string[]) => {
  const argv = minimist<{
    build: boolean | undefined;
    project: string | undefined;
  }>(args, {
    alias: { b: 'build', p: 'project' },
    boolean: 'build',
    string: 'project',
  });

  const { basename, dirname } = parseTscProject(argv.project);

  return {
    basename,
    dirname,
    pathname: path.join(dirname, basename),

    build: Boolean(argv.build),
    project: argv.project,
  };
};

const parseTscProject = (project: string | undefined) => {
  if (!project) {
    return {
      basename: 'tsconfig.build.json',
      dirname: process.cwd(),
    };
  }

  if (project.toLocaleLowerCase().endsWith('.json')) {
    return {
      basename: path.basename(project),
      dirname: path.dirname(project),
    };
  }

  return {
    basename: 'tsconfig.json',
    dirname: project,
  };
};
