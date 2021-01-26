import getPort from 'get-port';

/* Smallest 5-digit port; these are less common than 4-digit ports. */
const MIN_PORT = 10000;

/** Largest port in the IANA user port range. */
const MAX_PORT = 49151;

export const randomIntBetween = (min: number, max: number) =>
  min + Math.floor(Math.random() * (1 + max - min));

export const getRandomPort = () => {
  // Seed some random ports to use, if available.
  // get-port falls back to the private port range.
  const preferredPorts = new Array(10)
    .fill(null)
    .map(() => randomIntBetween(MIN_PORT, MAX_PORT));

  return getPort({ port: preferredPorts });
};
