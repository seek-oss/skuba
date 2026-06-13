export interface ICommandHooks {
  beforeBundling(inputDir: string, outputDir: string): string[];
  afterBundling(inputDir: string, outputDir: string): string[];
  beforeInstall(inputDir: string, outputDir: string): string[];
}

export interface BundlingOptions {
  bundlerConfig: string;
  nodeModules?: string[];
  commandHooks?: ICommandHooks;
  assetHash?: string;
  timeout?: number;
  ignoreScripts?: boolean;
}
