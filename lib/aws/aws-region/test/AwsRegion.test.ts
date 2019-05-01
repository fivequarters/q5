import { AwsRegion } from '../src';

describe('AwsRegion', () => {
  describe('fromCode', () => {
    it('should return an instance', async () => {
      const region = await AwsRegion.fromCode('us-east-1');
      expect(region.code).toBe('us-east-1');
      expect(region.name).toBe('N. Virginia');
      expect(region.fullName).toBe('US East (N. Virginia)');
      expect(region.zoneLimit).toBe(undefined);
      expect(region.public).toBe(true);
      expect(region.zones.length).toBe(6);
    });

    it('should throw if the region code is invalid', async () => {
      let message = '';
      try {
        await AwsRegion.fromCode('not-a-region');
      } catch (error) {
        message = error.message;
      }

      expect(message).toBe("Unknown AWS region code 'not-a-region'");
    });
  });
});
