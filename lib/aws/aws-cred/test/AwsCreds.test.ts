import { AwsCreds } from '../src';
import { mockSts } from '../src/AwsCreds';

describe('AwsCreds', () => {
  // ** Uncomment to manually test with real credentials **

  // it('should work with real creds', async () => {

  //   const usersAccount = '';
  //   const secretAccessKey = '';
  //   const accessKeyId = '';
  //   const userName = '';
  //   const mfaCode = '';
  //   const prodAccount = '';
  //   const prodRoleName = '';

  //   const awsCreds = await AwsCreds.create({
  //     account: usersAccount,
  //     secretAccessKey,
  //     accessKeyId,
  //     useMfa: true,
  //     userName,
  //     mfaCodeResolver: __ => Promise.resolve({ code: mfaCode }),
  //   });
  //   const roleCreds = awsCreds.asRole({ account: prodAccount, name: prodRoleName });
  //   const creds = await roleCreds.getCredentials();
  //   console.log(creds);
  // });

  describe('create()', () => {
    it('should accept a secret access key', async () => {
      const awsCreds = await AwsCreds.create({ account: '01', secretAccessKey: 'ABCD', accessKeyId: '005' });
      expect(awsCreds).toBeInstanceOf(AwsCreds);
    });
    it('should not require a secret access key', async () => {
      const awsCreds = await AwsCreds.create({ account: '01' });
      expect(awsCreds).toBeInstanceOf(AwsCreds);
    });
    it('should require an MFA code resolver if using MFA', async () => {
      let message = '';
      try {
        const awsCreds = await AwsCreds.create({
          account: '01',
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
      const awsCreds = await AwsCreds.create({
        account: '01',
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
      const awsCreds = await AwsCreds.create({ account: '01', secretAccessKey: 'ABCD', accessKeyId: '005' });
      const creds = await awsCreds.getCredentials();
      expect(creds).toEqual({ secretAccessKey: 'ABCD', accessKeyId: '005' });
    });
  });
});
