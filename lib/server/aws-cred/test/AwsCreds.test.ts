import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsCreds } from '../src';
import { mockSts } from '../src/AwsCreds';

describe('AwsCreds', () => {
  //
  // ** Uncomment to manually test with real credentials **
  //
  // it('should work with real creds', async () => {
  //   const awsDeployment = await AwsDeployment.create({
  //     regionCode: 'us-west-1',
  //     account: '<users account>',
  //     key: 'foo'
  //   });
  //   const awsCreds = await AwsCreds.create(awsDeployment, {
  //     secretAccessKey: '<secret access key>',
  //     accessKeyId: '<access key id>',
  //     useMfa: true,
  //     userName: '<user name>',
  //     mfaCodeResolver: __ => Promise.resolve({ code: '<mfa code>' }),
  //   });
  //   const roleCreds = awsCreds.asRole({ account: '<prod account>', name: '<role name>' });
  //   const creds = await roleCreds.getCredentials();
  //   console.log(creds)
  // });

  describe('create()', () => {
    it('should accept base creds', async () => {
      const deployment = await AwsDeployment.create({ regionCode: 'us-west-1', account: '01', key: 'foo' });
      const awsCreds = await AwsCreds.create(deployment, { secretAccessKey: 'ABCD', accessKeyId: '005' });
      expect(awsCreds).toBeInstanceOf(AwsCreds);
    });
    it('should not require base creds', async () => {
      const deployment = await AwsDeployment.create({ regionCode: 'us-west-1', account: '01', key: 'foo' });
      const awsCreds = await AwsCreds.create(deployment);
      expect(awsCreds).toBeInstanceOf(AwsCreds);
    });
    it('should require an MFA code resolver if using MFA', async () => {
      const deployment = await AwsDeployment.create({ regionCode: 'us-west-1', account: '01', key: 'foo' });
      let message = '';
      try {
        const awsCreds = await AwsCreds.create(deployment, {
          secretAccessKey: 'ABCD',
          accessKeyId: '005',
          useMfa: true,
        });
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe("If using MFA, the 'mfaCodeResolver' must be provided.");
    });
    it('should accept an MFA code resolver', async () => {
      const deployment = await AwsDeployment.create({ regionCode: 'us-west-1', account: '01', key: 'foo' });
      const awsCreds = await AwsCreds.create(deployment, {
        secretAccessKey: 'ABCD',
        accessKeyId: '005',
        useMfa: true,
        mfaCodeResolver: __ => Promise.resolve({ code: '1234' }),
      });
      expect(awsCreds).toBeInstanceOf(AwsCreds);
    });
  });

  describe('getCredentials()', () => {
    it('should return base creds for the base', async () => {
      const deployment = await AwsDeployment.create({ regionCode: 'us-west-1', account: '01', key: 'foo' });
      const awsCreds = await AwsCreds.create(deployment, { secretAccessKey: 'ABCD', accessKeyId: '005' });
      const creds = await awsCreds.getCredentials();
      expect(creds).toEqual({ secretAccessKey: 'ABCD', accessKeyId: '005' });
    });
  });
});
