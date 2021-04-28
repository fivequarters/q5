import { FakeAccount, resolveAccount } from './accountResolver';

let account = FakeAccount;
let accountToken: string;
let accountId: string;
let boundaries: string[] = [];

const function1Id = 'test-function-1';
const function2Id = 'test-function-2';
const function3Id = 'test-function-3';
const function4Id = 'test-function-4';
const function5Id = 'test-function-5';

const getEnv = () => {
  return { account, boundaryId: boundaries[0], function1Id, function2Id, function3Id, function4Id, function5Id };
};

const findTestLine = () => {
  if (!expect.getState().currentTestName) {
    return 0;
  }
  const testFiles = require('fs').readFileSync(expect.getState().testPath).toString('utf-8').split('\n');
  const testWords = expect.getState().currentTestName.replace(/ /g, '|');
  let maxLine: number = -1;
  testFiles.reduce((maxMatch: number, line: string, lineNo: number) => {
    const matches = line.match(new RegExp(testWords, 'g'));
    if (matches && matches.length > maxMatch) {
      maxLine = lineNo;
      return matches.length;
    }
    return maxMatch;
  }, 0);

  return maxLine + 1;
};

const getTestWart = () => {
  const testLn = findTestLine();
  if (testLn === 0) {
    return 'test-boundary';
  }

  return (
    'test-' +
    require('path').basename(expect.getState().testPath).replace('.test.ts', '').replace(/\./g, '-') +
    `-${testLn}`
  );
};

const newBoundaryId = (wart: string): string => {
  return `${wart}-${Math.floor(Math.random() * 99999999).toString(8)}`;
};

const nextBoundary = () => {
  boundaries = [newBoundaryId(getTestWart()), ...boundaries];
  return boundaries[0];
};

const getAllBoundaries = () => boundaries;

const initializeEnvironment = async () => {
  account = await resolveAccount();
  accountId = account.accountId;
  accountToken = account.accessToken;
};

const resetEnvironment = () => {
  account.accountId = accountId;
  account.accessToken = accountToken;
};

beforeAll(async () => {
  await initializeEnvironment();
}, 200000);

beforeEach(async () => {
  resetEnvironment();
  nextBoundary();
}, 200000);

export { getEnv, nextBoundary, initializeEnvironment, getAllBoundaries, resetEnvironment };
