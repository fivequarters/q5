const { jest } = require('@5qtrs/tool-config');
jest.testPathIgnorePatterns = ['/node_modules/', '/assets/'];
module.exports = jest;
