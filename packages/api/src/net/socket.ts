import net from 'net';

export interface SocketAddress {
  host: string;
  port: number;
}

const trySocket = async (host: string, port: number) =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    const onFailure = () => {
      socket.destroy();
      resolve(false);
    };

    const onSuccess = () => socket.end(() => resolve(true));

    socket
      .connect(port, host, onSuccess)
      .once('error', onFailure)
      .once('timeout', onFailure)
      .setTimeout(1_000);
  });

export const pollSocket = async (host: string, port: number, timeout: number) =>
  new Promise<void>((resolve, reject) => {
    const callPort = async () => {
      const success = await trySocket(host, port);

      if (!success) {
        return;
      }

      clearTimeout(intervalId);
      clearTimeout(timeoutId);

      resolve();
    };

    const intervalId = setInterval(() => {
      callPort().catch(() => undefined);
    }, 250);

    const timeoutId = setTimeout(() => {
      clearTimeout(intervalId);
      clearTimeout(timeoutId);

      reject(Error(`could not reach ${host}:${port} within ${timeout}ms`));
    }, timeout);

    callPort().catch(() => undefined);
  });
