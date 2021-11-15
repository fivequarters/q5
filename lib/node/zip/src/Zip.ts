import JSZip from 'jszip';

// ----------------
// Exported Classes
// ----------------

export class Zip {
  public static async create(data?: Buffer) {
    const zip = new Zip();
    if (data) {
      await zip.zip.loadAsync(data);
    }
    return zip;
  }
  private zip: JSZip;

  private constructor() {
    this.zip = new JSZip();
  }

  public addFile(path: string, data: string | Buffer) {
    this.zip.file(path, data);
  }

  public async getFile(path: string) {
    return this.zip.file(path)?.async<'text'>('text');
  }

  public async generate(): Promise<Buffer> {
    return this.zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });
  }
}
