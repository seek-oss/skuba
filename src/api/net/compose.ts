import { createExec } from '../../utils/exec.js';

const portStringToNumber = (portString: string) => {
  const port = Number(portString);

  if (!Number.isSafeInteger(port)) {
    throw Error(`received non-integer port: '${portString}'`);
  }

  return port;
};

export const resolveComposeAddress = async (
  privateHost: string,
  privatePort: number,
) => {
  const exec = createExec({ stdio: 'pipe' });

  const { stdout } = await exec(
    'docker',
    'compose',
    'port',
    privateHost,
    String(privatePort),
  );

  const [host, portString] = stdout.trim().split(':');

  if (!host || !portString) {
    throw Error(`Docker Compose returned unrecognised address: '${stdout}'`);
  }

  return { host, port: portStringToNumber(portString) };
};
