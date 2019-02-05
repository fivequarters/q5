const config: any = {
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testRegex: '/test/.*\\.(ts|tsx|js)$',
};

export default config;
