import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsNetwork } from '../src';

describe('AwsVpc', () => {
  describe('create()', () => {
    it('should return an instance of S3', async () => {
      jest.setTimeout(50000);
      const deployment = await AwsDeployment.create({
        regionCode: 'us-east-2',
        account: '964729438495',
        key: 'test',
      });
      const creds = await AwsCreds.create({
        account: '964729438495',
        accessKeyId: 'AKIAIJKCLY7K5HAEQRWA',
        secretAccessKey: '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',
      });
      const network = await AwsNetwork.create({ creds, deployment });
      const result = await network.ensureNetwork('main');
      console.log(result);
    });
  });
});
