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

export const rootLogger = {
  error: jest.fn(),
  info: jest.fn(),

  clear: () => {
    rootLogger.error.mockClear();
    rootLogger.info.mockClear();
  },

  spy: () => {
    jest
      .spyOn(logging.rootLogger, 'error')
      .mockImplementation(rootLogger.error);
    jest.spyOn(logging.rootLogger, 'info').mockImplementation(rootLogger.info);
  },
};
