import { replaceAll } from '../src';

describe('replaceAll', () => {
  it('should replace all instances of the search string in the target string', () => {
    expect(replaceAll('hello', 'l', 'y')).toEqual('heyyo');
  });

  it('should do nothing if no instances of the search string in the target string', () => {
    expect(replaceAll('hello', 'L', 'y')).toEqual('hello');
  });

  it('should not search the replacement string in the target string', () => {
    expect(replaceAll('hello', 'l', 'll')).toEqual('hellllo');
  });

  it('should find the search string at the start of the target string', () => {
    expect(replaceAll('--option', '-', '*')).toEqual('**option');
  });
});
