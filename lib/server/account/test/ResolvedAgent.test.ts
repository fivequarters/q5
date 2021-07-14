import fs from 'fs';
import { ResolvedAgent } from '../src';
import { signJwt } from '@5qtrs/jwt';
import { JWT_PERMISSION_CLAIM } from '@5qtrs/constants';
import { createKeyPair } from '@5qtrs/key-pair';

const signJwtOptions = {
  algorithm: 'RS256',
  expiresIn: 600,
  audience: 'Random Audience',
  issuer: 'Random Issuer',
  subject: 'ResolvedAgent',
};

describe('ResolvedAgent', () => {
  it('should validate access token', async () => {
    const keyPair = await createKeyPair();
    const jwt = await signJwt({}, keyPair.privateKey, signJwtOptions);
    const decodedJwtPayload = await ResolvedAgent.validateAccessTokenSignature(jwt, keyPair.publicKey);
    expect(decodedJwtPayload).toBeDefined();
  });

  it('should validate access token with valid inline permissions', async () => {
    const keyPair = await createKeyPair();
    const jwt = await signJwt(
      {
        [JWT_PERMISSION_CLAIM]: {
          allow: [{ action: 'some-action', resource: 'some-resource' }],
        },
      },
      keyPair.privateKey,
      signJwtOptions
    );
    const decodedJwtPayload = await ResolvedAgent.validateAccessTokenSignature(jwt, keyPair.publicKey);
    expect(decodedJwtPayload).toBeDefined();
  });

  it('should validate access token with empty inline permissions', async () => {
    const keyPair = await createKeyPair();

    const jwt = await signJwt(
      {
        [JWT_PERMISSION_CLAIM]: {
          allow: [],
        },
      },
      keyPair.privateKey,
      signJwtOptions
    );
    const decodedJwt = await ResolvedAgent.validateAccessTokenSignature(jwt, keyPair.publicKey);
    expect(decodedJwt).toBeDefined();

    const anotherJwt = await signJwt(
      {
        [JWT_PERMISSION_CLAIM]: {},
      },
      keyPair.privateKey,
      signJwtOptions
    );
    const anotherDecodedJwt = await ResolvedAgent.validateAccessTokenSignature(anotherJwt, keyPair.publicKey);
    expect(anotherDecodedJwt).toBeDefined();
  });

  it('should fail on invalid inline permissions (invalid resource property)', async () => {
    const keyPair = await createKeyPair();
    const jwt = await signJwt(
      {
        [JWT_PERMISSION_CLAIM]: {
          allow: [{ action: 'some-action', functionResource: 'some-resource' }],
        },
      },
      keyPair.privateKey,
      signJwtOptions
    );

    try {
      await ResolvedAgent.validateAccessTokenSignature(jwt, keyPair.publicKey);
      fail('Expected an exception');
    } catch (err) {
      expect(err).toBeDefined();
      expect(err.message).toBeDefined();
      expect(err.message).toBe(
        "The JWT could not be validated due to the following error: 'Malformed inline permission'"
      );
    }
  });

  it('should fail on invalid inline permissions (invalid action property)', async () => {
    const keyPair = await createKeyPair();
    const jwt = await signJwt(
      {
        [JWT_PERMISSION_CLAIM]: {
          allow: [{ actionZ: 'some-action', resource: 'some-resource' }],
        },
      },
      keyPair.privateKey,
      signJwtOptions
    );

    try {
      await ResolvedAgent.validateAccessTokenSignature(jwt, keyPair.publicKey);
      fail('Expected an exception');
    } catch (err) {
      expect(err).toBeDefined();
      expect(err.message).toBeDefined();
      expect(err.message).toBe(
        "The JWT could not be validated due to the following error: 'Malformed inline permission'"
      );
    }
  });
});
