import { createStringReplacer } from '../../../utils/copy.js';

export const replacePackageReferences = (props: {
  old: {
    packageName: string;
    repoSlug: string;
  };
  new: {
    packageName: string;
    repoSlug: string;
  };
}) =>
  createStringReplacer([
    {
      input: new RegExp(`(['"])${props.old.packageName}(['"/])`, 'g'),
      output: `$1${props.new.packageName}$2`,
    },
    {
      input: new RegExp(props.old.repoSlug, 'ig'),
      output: props.new.repoSlug,
    },
  ]);
