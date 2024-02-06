export const NPMRC_LINES = ['.npmrc', '!.npmrc', '/.npmrc', '!/.npmrc'];

// Preventing against _auth, _authToken, _password
// https://docs.npmjs.com/cli/v10/configuring-npm/npmrc#auth-related-configuration
export const hasNpmrcSecret = (lineOrFullFileContents: string): boolean =>
  lineOrFullFileContents.includes('_auth') ||
  lineOrFullFileContents.includes('_password');
