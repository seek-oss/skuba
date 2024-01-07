import { handleRejections } from './handleRejections';

export const upgrade = async () => {
  // TODO: is this the right directory?
  const dir = process.cwd();

  await handleRejections(dir);
};
