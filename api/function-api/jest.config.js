const { jest } = require('@5qtrs/tool-config');
module.exports = {
  ...jest,
  setupFilesAfterEnv: ['./test/jest.setup.ts'],
};
