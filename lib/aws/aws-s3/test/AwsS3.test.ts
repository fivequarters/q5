import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsS3 } from '../src';

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
      const s3 = await AwsS3.create({ creds, deployment });
      const buckets = await s3.listBuckets();
      console.log(buckets);

      await s3.createBucket('test-bucket');

      const exists = await s3.bucketExists('test-bucket');
      console.log(exists);

      await s3.uploadObject('test-bucket', '123', 'hello');

      const keys = await s3.listObjectKeys('test-bucket');
      console.log(keys);

      const content = await s3.getObject('test-bucket', '123');
      console.log(content.toString());
    });
  });
});
