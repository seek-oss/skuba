import * as logging from 'src/framework/logging.js';

export const logger = {
  error: jest.fn(),
  info: jest.fn(),

  clear: () => {
    logger.error.mockClear();
    logger.info.mockClear();
  },

  spy: () => {
    jest.spyOn(logging.logger, 'error').mockImplementation(logger.error);
    jest.spyOn(logging.logger, 'info').mockImplementation(logger.info);
  },
};
