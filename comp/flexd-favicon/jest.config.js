const path = require('path');
const { jest } = require('@5qtrs/tool-config');
jest.setupFiles = [path.join(__dirname, 'jest.setup.js')];
jest.testEnvironment = 'jsdom';
module.exports = jest;
