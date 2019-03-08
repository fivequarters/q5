import { padCenter, padLeft, padRight } from '../src';

describe('padLeft', () => {
  it('should not pad a string that is greater than the width', () => {
    expect(padLeft('hello', 3)).toEqual('hello');
  });

  it('should not pad a string that is the width', () => {
    expect(padLeft('hello', 5)).toEqual('hello');
  });

  it('should pad to the left', () => {
    expect(padLeft('hello', 8)).toEqual('   hello');
  });

  it('should pad to the left even with whitespace present', () => {
    expect(padLeft('hello ', 8)).toEqual('  hello ');
  });
});

describe('padRight', () => {
  it('should not pad a string that is greater than the width', () => {
    expect(padRight('hello', 3)).toEqual('hello');
  });

  it('should not pad a string that is the width', () => {
    expect(padRight('hello', 5)).toEqual('hello');
  });

  it('should pad to the right', () => {
    expect(padRight('hello', 8)).toEqual('hello   ');
  });

  it('should pad to the right even with whitespace present', () => {
    expect(padRight(' hello', 8)).toEqual(' hello  ');
  });
});

describe('padCenter', () => {
  it('should not pad a string that is greater than the width', () => {
    expect(padCenter('hello', 3)).toEqual('hello');
  });

  it('should not pad a string that is the width', () => {
    expect(padCenter('hello', 5)).toEqual('hello');
  });

  it('should pad equally to right and left', () => {
    expect(padCenter('hello', 9)).toEqual('  hello  ');
  });

  it('should pad to the right one extra space if remaming whitespace is odd', () => {
    expect(padCenter('hello', 10)).toEqual('  hello   ');
  });
});
