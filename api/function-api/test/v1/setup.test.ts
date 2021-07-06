import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Jest Setup Tests', () => {
  test('toBeUUID fails null', () => {
    expect(null).not.toBeUUID();
  });

  test('toBeUUID fails undefined', () => {
    expect(undefined).not.toBeUUID();
  });

  test('toBeUUID fails object', () => {
    expect({}).not.toBeUUID();
  });
});
