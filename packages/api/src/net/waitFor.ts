import { resolveComposeAddress } from './compose.js';
import { type SocketAddress, pollSocket } from './socket.js';

/**
 * Wait for a resource to start listening on a socket address.
 *
 * The socket is polled on an interval until it accepts a connection or the
 * `timeout` is reached.
 */
export const waitFor = async ({
  host = 'localhost',
  port,
  resolveCompose = false,
  timeout = 15_000,
}: {
  host?: string;

  port: number;

  /**
   * Whether to treat the `host` and `port` arguments as a private Docker
   * Compose network address and to resolve them to a public local address.
   *
   * This is typically:
   *
   * - Enabled locally, when the application is running directly on the machine
   * - Disabled in CI, when running in a container on the Docker Compose network
   */
  resolveCompose?: boolean;

  timeout?: number;
}): Promise<SocketAddress> => {
  const resolvedAddress = resolveCompose
    ? await resolveComposeAddress(host, port)
    : { host, port };

  await pollSocket(resolvedAddress.host, resolvedAddress.port, timeout);

  return resolvedAddress;
};
