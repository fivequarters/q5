import zlib from 'zlib';

// ------------------
// Exported Functions
// ------------------

export async function zip(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(value);
    zlib.gzip(buffer, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result.toString('base64'));
    });
  });
}

export function unzip(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(value, 'base64');
    zlib.unzip(buffer, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result.toString());
    });
  });
}
