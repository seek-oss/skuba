import * as logging from 'src/framework/logging';

export const contextLogger = {
  error: jest.fn(),
  info: jest.fn(),

  clear: () => {
    contextLogger.error.mockClear();
    contextLogger.info.mockClear();
  },

  spy: () =>
    jest.spyOn(logging, 'contextLogger').mockReturnValue(contextLogger as any),
};
