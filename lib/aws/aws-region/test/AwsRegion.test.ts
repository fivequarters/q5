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

  describe('isRegion', () => {
    it('should return true for all regions', async () => {
      const regions = ['us-west-1', 'us-east-2', 'us-gov-west-1', 'eu-north-1'];
      for (const region of regions) {
        expect(AwsRegion.isRegion(region)).toEqual(true);
      }
    });

    it('should return false for non regions', async () => {
      const notRegions = ['api', '', '*', 'us-west-9'];
      for (const notRegion of notRegions) {
        expect(AwsRegion.isRegion(notRegion)).toEqual(false);
      }
    });
  });
});
