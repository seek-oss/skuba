import { memfs } from 'memfs';

/**
 * Isolated memfs volume whose cwd matches the host process.
 *
 * memfs 4.72+ defaults the singleton `vol`/`fs` export to virtual cwd `'/'`.
 * Tests that mix relative keys with host `process.cwd()` need an explicit cwd:
 * https://github.com/streamich/memfs/issues/1296
 */
export const { fs, vol } = memfs({}, process.cwd());

export default fs;
