// ------------------
// Exported Constants
// ------------------

export const jest: any = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testRegex: '/test/.*\\.test.(ts|tsx|js)$',
  testEnvironment: 'node',
};
