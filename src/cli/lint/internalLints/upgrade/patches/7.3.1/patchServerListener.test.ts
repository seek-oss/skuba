// eslint-disable-next-line no-restricted-imports -- fs-extra is mocked
import fs from 'fs';
import { inspect } from 'util';

import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig } from '../../index.js';

import { tryPatchServerListener } from './patchServerListener.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

const LISTENER_WITH_CALLBACK = `
app.listen(config.port, () => {
  const address = listener.address();

  if (typeof address === 'object' && address) {
    logger.debug(\`listening on port \${address.port}\`);
  }
});
`;

const LISTENER_WITHOUT_CALLBACK = `
app.listen(config.port);
`;

const consoleLog = vi.spyOn(console, 'log');

const writeFile = vi.spyOn(memfs.fs.promises, 'writeFile');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(vi.clearAllMocks);
beforeEach(() => vol.reset());

describe('patchServerListener', () => {
  describe('format mode', () => {
    it('patches a listener with a callback and existing variable reference', async () => {
      vol.fromJSON({ 'src/listen.ts': LISTENER_WITH_CALLBACK });

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "src/listen.ts": "const listener = app.listen(config.port, () => {
          const address = listener.address();

          if (typeof address === 'object' && address) {
            logger.debug(\`listening on port \${address.port}\`);
          }
        });

        // Gantry ALB default idle timeout is 30 seconds
        // https://nodejs.org/docs/latest-v20.x/api/http.html#serverkeepalivetimeout
        // Node default is 5 seconds
        // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
        // AWS recommends setting an application timeout larger than the load balancer
        listener.keepAliveTimeout = 31000;
        ",
        }
      `);
    });

    it('patches a listener without a callback', async () => {
      vol.fromJSON({ 'src/listen.ts': LISTENER_WITHOUT_CALLBACK });

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "src/listen.ts": "const listener = app.listen(config.port);

        // Gantry ALB default idle timeout is 30 seconds
        // https://nodejs.org/docs/latest-v20.x/api/http.html#serverkeepalivetimeout
        // Node default is 5 seconds
        // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
        // AWS recommends setting an application timeout larger than the load balancer
        listener.keepAliveTimeout = 31000;
        ",
        }
      `);
    });

    it('handles a lack of server listener', async () => {
      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no listener file found',
      });

      expect(volToJson()).toStrictEqual({});
    });

    it('handles a filesystem error', async () => {
      const err = new Error('Badness!');

      writeFile.mockRejectedValueOnce(err);

      const files = { 'src/listen.ts': LISTENER_WITH_CALLBACK };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Failed to patch server listener.'),
      );
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(err.toString()),
      );
    });

    it('skips the templated Koa listener', async () => {
      const listener = await fs.promises.readFile(
        require.resolve(
          '../../../../../../../template/koa-rest-api/src/listen.ts',
        ),
        'utf-8',
      );

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips the templated Express listener', async () => {
      const listener = await fs.promises.readFile(
        require.resolve(
          '../../../../../../../template/express-rest-api/src/listen.ts',
        ),
        'utf-8',
      );

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a file with keep-alive already set', async () => {
      const listener = `${LISTENER_WITH_CALLBACK}

    listener.keepAliveTimeout = 0;`;

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a non-standard file', async () => {
      const files = { 'src/listen.ts': "console.log('Who dis?')" };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no server listener found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips an empty file', async () => {
      const files = { 'src/listen.ts': '' };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no listener file found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('lint mode', () => {
    it('patches a listener with a callback and existing variable reference', async () => {
      vol.fromJSON({ 'src/listen.ts': LISTENER_WITH_CALLBACK });

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual({ 'src/listen.ts': LISTENER_WITH_CALLBACK });
    });

    it('patches a listener without a callback', async () => {
      vol.fromJSON({ 'src/listen.ts': LISTENER_WITHOUT_CALLBACK });

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual({
        'src/listen.ts': LISTENER_WITHOUT_CALLBACK,
      });
    });

    it('handles a lack of server listener', async () => {
      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no listener file found',
      });

      expect(volToJson()).toStrictEqual({});
    });

    it('skips the templated Koa listener', async () => {
      const listener = await fs.promises.readFile(
        require.resolve(
          '../../../../../../../template/koa-rest-api/src/listen.ts',
        ),
        'utf-8',
      );

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips the templated Express listener', async () => {
      const listener = await fs.promises.readFile(
        require.resolve(
          '../../../../../../../template/express-rest-api/src/listen.ts',
        ),
        'utf-8',
      );

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a file with keep-alive already set', async () => {
      const listener = `${LISTENER_WITH_CALLBACK}

    listener.keepAliveTimeout = 0;`;

      const files = { 'src/listen.ts': listener };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'keepAliveTimeout already configured',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips a non-standard file', async () => {
      const files = { 'src/listen.ts': "console.log('Who dis?')" };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no server listener found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('skips an empty file', async () => {
      const files = { 'src/listen.ts': '' };

      vol.fromJSON(files);

      await expect(
        tryPatchServerListener({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no listener file found',
      });

      expect(volToJson()).toStrictEqual(files);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
