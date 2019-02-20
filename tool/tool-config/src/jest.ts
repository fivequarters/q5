// ------------------
// Exported Constants
// ------------------

export const jest: any = {
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testRegex: '/test/.*\\.(ts|tsx|js)$',
  testEnvironment: 'node',
};
