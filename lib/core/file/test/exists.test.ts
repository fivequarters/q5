import { join } from 'path';
import { exists } from '../src';

describe('exists()', () => {
  it('should return true for existing directory', async () => {
    expect(await exists(__dirname)).toBe(true);
  });

  it('should return true for existing file', async () => {
    expect(await exists(__filename)).toBe(true);
  });

  it('should return false for a non-existing directory', async () => {
    expect(await exists(join(__dirname, 'no-such-dir/'))).toBe(false);
  });

  it('should return false for a non-existing file', async () => {
    expect(await exists(join(__dirname, 'no-such-file.txt'))).toBe(false);
  });
});
