import { AwsDeployment } from '../src';

describe('AwsDeployment', () => {
  describe('create', () => {
    it('should return an instance', async () => {
      const awsEnv = await AwsDeployment.create({ regionCode: 'us-east-1', account: '00000005', key: 'local' });
      expect(awsEnv.account).toBe('00000005');
      expect(awsEnv.key).toBe('local');
      expect(awsEnv.region.code).toBe('us-east-1');
      expect(awsEnv.region.name).toBe('N. Virginia');
      expect(awsEnv.region.fullName).toBe('US East (N. Virginia)');
      expect(awsEnv.region.zones.length).toBe(6);
    });
  });
});
