import { generateKeyPair } from 'crypto';

// -------------------
// Exported Interfaces
// -------------------

export interface IKeyPairResult {
  publicKey: string;
  privateKey: string;
}

// ------------------
// Exported Functions
// ------------------

export function createKeyPair(): Promise<IKeyPairResult> {
  return new Promise((resolve, reject) => {
    const privateKeyEncoding: any = {
      type: 'pkcs8',
      format: 'pem',
    };

    generateKeyPair(
      'rsa',
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding,
      },
      (error, privateKey, publicKey) => {
        if (error) {
          return reject(error);
        }

        resolve({ publicKey, privateKey });
      }
    );
  });
}
