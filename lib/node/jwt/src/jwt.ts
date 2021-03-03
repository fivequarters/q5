import { request } from '@5qtrs/request';
import jwt from 'jsonwebtoken';

// ------------------
// Internal Constants
// ------------------

const urlToKey: { [index: string]: { [index: string]: string } } = {};

// ------------------
// Internal Functions
// ------------------

function certToPEM(cert: string) {
  const match = cert.match(/.{1,64}/g) || [];
  return `-----BEGIN CERTIFICATE-----\n${match.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function prepadSigned(hex: string) {
  const msb = hex[0];
  if (msb < '0' || msb > '7') {
    return `00${hex}`;
  }
  return hex;
}

function numberToHex(value: number) {
  const asString = value.toString(16);
  if (asString.length % 2) {
    return `0${asString}`;
  }
  return asString;
}

function encodeLengthHex(length: number) {
  if (length <= 127) {
    return numberToHex(length);
  }
  const hexNumber = numberToHex(length);
  const lengthOfLengthByte = 128 + hexNumber.length / 2;
  return numberToHex(lengthOfLengthByte) + hexNumber;
}

function rsaPublicKeyToPEM(modulusB64: string, exponentB64: string) {
  const modulus = Buffer.from(modulusB64, 'base64');
  const exponent = Buffer.from(exponentB64, 'base64');

  const modulusHex = prepadSigned(modulus.toString('hex'));
  const exponentHex = prepadSigned(exponent.toString('hex'));

  const modlen = modulusHex.length / 2;
  const explen = exponentHex.length / 2;

  const encodedModlen = encodeLengthHex(modlen);
  const encodedExplen = encodeLengthHex(explen);
  const encodedPubkey =
    '30' +
    encodeLengthHex(modlen + explen + encodedModlen.length / 2 + encodedExplen.length / 2 + 2) +
    '02' +
    encodedModlen +
    modulusHex +
    '02' +
    encodedExplen +
    exponentHex;

  const der = Buffer.from(encodedPubkey, 'hex').toString('base64') as string;

  let pem = `-----BEGIN RSA PUBLIC KEY-----\n`;
  pem += `${(der.match(/.{1,64}/g) || []).join('\n')}`;
  pem += `\n-----END RSA PUBLIC KEY-----\n`;
  return pem;
}

async function downloadJson(url: string) {
  let response;
  try {
    response = await request(url);
  } catch (error) {
    throw new Error(`Unable to resolve secret '${url}'; Downloading key file failed: ${error}`);
  }

  if (response.status !== 200) {
    throw new Error(
      `Unable to resolve secret '${url}'; Downloading key file returned status code '${response.status}'.`
    );
  }

  return response.data;
}

function parseJwks(kid: string, url: string, json: any) {
  try {
    for (const key of json.keys) {
      if (key.use === 'sig' && key.kty === 'RSA' && key.kid && ((key.x5c && key.x5c.length) || (key.n && key.e))) {
        const keyLookup = (urlToKey[url] = urlToKey[url] || {});
        keyLookup[key.kid] = key.x5c && key.x5c.length ? certToPEM(key.x5c[0]) : rsaPublicKeyToPEM(key.n, key.e);
      }
    }
  } catch (error) {
    // do nothing
  }
}

function parseCerts(kid: string, url: string, json: any) {
  try {
    for (const keyId in json) {
      if (keyId) {
        urlToKey[url] = urlToKey[url] || {};
        urlToKey[url][keyId] = json[keyId];
      }
    }
  } catch (error) {
    // do nothing
  }
}

function getCachedKey(kid: string, url: string) {
  const kidsForUrl = urlToKey[url];
  if (kidsForUrl) {
    return kidsForUrl[kid];
  }
  return undefined;
}

async function resolveSecret(token: string, secretOrUrl: string, ignoreCache: boolean = false) {
  if (secretOrUrl.indexOf('https://') === 0) {
    const url = secretOrUrl;
    const decodedToken = decodeJwtHeader(token);
    const kid = decodedToken.kid;
    if (!kid) {
      throw new Error("Unable to resolve secret; token header does not have a 'kid' value.");
    }

    let key = !ignoreCache ? getCachedKey(kid, url) : undefined;
    if (!key) {
      const json = await downloadJson(secretOrUrl);
      if (json.keys) {
        parseJwks(kid, url, json);
      } else {
        parseCerts(kid, url, json);
      }
      key = getCachedKey(kid, url);
    }

    if (!key) {
      throw new Error('Unable to resolve secret; key not found in downloaded key file');
    }
    return { secret: key };
  }
  return { secret: secretOrUrl };
}

// ------------------
// Exported Functions
// ------------------

export function decodeJwtHeader(token: string) {
  const decoded = jwt.decode(token, { complete: true }) as { [key: string]: any };
  if (decoded && decoded.header) {
    return decoded.header;
  }
  return undefined;
}

export function decodeJwt(token: string, json: boolean = false, complete?: boolean) {
  return jwt.decode(token, { json, complete }) as { [key: string]: any };
}

export async function verifyJwt(token: string, secretOrUrl: string, options?: any): Promise<any> {
  const resolvedSecret = await resolveSecret(token, secretOrUrl);
  return new Promise((resolve, reject) => {
    jwt.verify(token, resolvedSecret.secret, options || {}, (error, verifiedToken) => {
      if (error) {
        return reject(error);
      }

      resolve(verifiedToken);
    });
  });
}

export async function signJwt(payload: any, secret: string, options?: any): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options || {}, (error, token) => {
      if (error) {
        return reject(error);
      }

      resolve(token);
    });
  });
}
