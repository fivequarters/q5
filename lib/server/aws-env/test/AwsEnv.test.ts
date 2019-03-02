import { AwsEnv } from '../src';

describe('AwsEnv', () => {
  describe('create', () => {
    it('should return an instance', async () => {
      const awsEnv = await AwsEnv.create({ regionCode: 'us-east-1', account: '00000005', environment: 'local' });
      expect(awsEnv.account).toBe('00000005');
      expect(awsEnv.environment).toBe('local');
      expect(awsEnv.region.code).toBe('us-east-1');
      expect(awsEnv.region.name).toBe('N. Virginia');
      expect(awsEnv.region.fullName).toBe('US East (N. Virginia)');
      expect(awsEnv.region.zones.length).toBe(6);
    });
  });
});
