import { WorkspaceInfo } from '../src';

describe('WorkspaceInfo', () => {
  describe('Create()', () => {
    it('should return an instance with correct properties', async () => {
      const testSet = [
        ['', 'abc', '', '', 'abc', 'abc', 'abc'],
        ['@org', 'abc', '', 'org', 'abc', '@org/abc', 'abc'],
        ['org', 'abc', '', 'org', 'abc', '@org/abc', 'abc'],
        ['org', '@not-org/abc', '', 'not-org', 'abc', '@not-org/abc', 'abc'],
        ['org', '@not-org/abc', '', 'not-org', 'abc', '@not-org/abc', 'abc'],
        ['', '@org/abc', '', 'org', 'abc', '@org/abc', 'abc'],
        ['', '@org/abc', 'not-abc', 'org', 'abc', '@org/abc', 'not-abc/abc'],
        ['', '@org/abc', 'abc', 'org', 'abc', '@org/abc', 'abc'],
        ['', '@org/abc', '.', 'org', 'abc', '@org/abc', 'abc'],
      ];

      for (const testData of testSet) {
        const [org, name, location] = testData.splice(0, 3);
        const workspaceInfo = WorkspaceInfo.Create(org, name, location);
        expect(workspaceInfo.Org).toBe(testData.shift());
        expect(workspaceInfo.Name).toBe(testData.shift());
        expect(workspaceInfo.FullName).toBe(testData.shift());
        expect(workspaceInfo.Location).toBe(testData.shift());
      }
    });

    it('should allow the location to be undefined', async () => {
      const workspaceInfo = WorkspaceInfo.Create('org', 'abc');
      expect(workspaceInfo.Org).toBe('org');
      expect(workspaceInfo.Name).toBe('abc');
      expect(workspaceInfo.FullName).toBe('@org/abc');
      expect(workspaceInfo.Location).toBe('');
    });

    it('should error if the name has an @ but no /', async () => {
      let actual;
      try {
        const workspaceInfo = WorkspaceInfo.Create('', '@abc');
      } catch (error) {
        actual = error;
      }
      expect(actual.message).toBe("The workspace name '@abc' is invalid");
    });

    it('should error if the name has ano @ but a /', async () => {
      let actual;
      try {
        const workspaceInfo = WorkspaceInfo.Create('', 'org/abc');
      } catch (error) {
        actual = error;
      }
      expect(actual.message).toBe("The workspace name 'org/abc' is invalid");
    });
  });
});
