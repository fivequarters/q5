import { FakeAccount, resolveAccount } from './accountResolver';

const newBoundaryId = (): string => {
  return `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
};

let account = FakeAccount;
let accountToken: string;
let boundaries: string[] = [];

const function1Id = 'test-function-1';
const function2Id = 'test-function-2';
const function3Id = 'test-function-3';
const function4Id = 'test-function-4';
const function5Id = 'test-function-5';

const getEnv = () => {
  return { account, boundaryId: boundaries[0], function1Id, function2Id, function3Id, function4Id, function5Id };
};

const nextBoundary = () => {
  boundaries = [newBoundaryId(), ...boundaries];
  return boundaries[0];
};

const getAllBoundaries = () => boundaries;

const initializeEnvironment = async () => {
  account = await resolveAccount();
  accountToken = account.accessToken;
};

const resetEnvironment = () => {
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
