import { ParsedArgs } from '../src/ParsedArgs';

describe('ParsedArgs', () => {
  describe('create()', () => {
    it('should return an instance of ParsedArgs', () => {
      const parsedArgs = ParsedArgs.create([]);
      expect(parsedArgs).toBeInstanceOf(ParsedArgs);
    });
  });

  describe('termsAndArguments', () => {
    it('should return the terms/arguments in order with options filtered out', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-op1', '--option2', 'xyz']);
      expect(parsedArgs.termsAndArguments).toEqual(['abc', 'qrs']);
    });
    it('should allow arguments after filtering out options', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-op1', '--option2', 'xyz', 'foo']);
      expect(parsedArgs.termsAndArguments).toEqual(['abc', 'qrs', 'foo']);
    });
  });

  describe('options', () => {
    it('should return the options', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-op1', '--option2', 'xyz']);
      expect(parsedArgs.options).toEqual({ '-op1': [], '--option2': ['xyz'] });
    });
    it('should allow option values to be set with =', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-op1=value=hello', '--option2', 'xyz']);
      expect(parsedArgs.options).toEqual({ '-op1': ['value=hello'], '--option2': ['xyz'] });
    });
    it('should allow option values to be set with :', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-op1::off', '--option2', 'xyz']);
      expect(parsedArgs.options).toEqual({ '-op1': [':off'], '--option2': ['xyz'] });
    });
    it('should capture option values with no option name', () => {
      const parsedArgs = ParsedArgs.create(['abc', 'qrs', '-:off', '--=here', 'xyz']);
      expect(parsedArgs.options).toEqual({ '-<empty string>': ['off'], '--<empty string>': ['here'] });
    });
  });
});
