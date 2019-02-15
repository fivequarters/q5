const path = require('path');
const { jest } = require('@5qtrs/tool-config');
jest.setupTestFrameworkScriptFile = path.join(__dirname, 'jest.setup.js');
module.exports = jest;
