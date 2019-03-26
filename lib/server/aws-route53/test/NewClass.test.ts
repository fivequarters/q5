import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsRoute53 } from '../src';

describe('S3', () => {
  describe('create()', () => {
    it('should return an instance of S3', async () => {
      jest.setTimeout(50000);
      const deployment = await AwsDeployment.create({
        regionCode: 'us-east-1',
        account: '964729438495',
        key: 'test',
      });
      const creds = await AwsCreds.create({
        account: '964729438495',
        accessKeyId: 'AKIAIJKCLY7K5HAEQRWA',
        secretAccessKey: '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',
      });
      const route53 = await AwsRoute53.create({ creds, deployment });
      await route53.deleteRecord('www.randall.com', { name: 'rat.www.randall.com', type: 'CNAME', values: 'xyz' });
    });
  });
});
