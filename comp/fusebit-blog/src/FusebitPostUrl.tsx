import { FusebitPostMeta } from './FusebitPostMeta';

// ------------------
// Internal Constants
// ------------------

const global = {
  domain: 'https://fusebit.io',
};

// ------------------
// Internal Functions
// ------------------

function ensureTwoDigits(value: number) {
  const asString = value.toString();
  return asString.length === 1 ? `0${asString}` : asString;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitPostUrl {
  private url: string;
  private fullUrl?: string;

  private constructor(url: string) {
    this.url = url;
  }

  public static setDomain(domain: string) {
    global.domain = domain;
  }

  public static create(year: number, month: number, day: number, postId: string) {
    return new FusebitPostUrl(`/blog/${year}/${ensureTwoDigits(month)}/${ensureTwoDigits(day)}/${postId}`);
  }

  public static createFromMeta(meta: FusebitPostMeta) {
    const { year, month, day, postId } = meta;
    return FusebitPostUrl.create(year, month, day, postId);
  }

  public relativeUrl(hash?: string) {
    return hash ? `${this.url}#${hash}` : this.url;
  }

  public absoluteUrl(hash?: string) {
    if (!this.fullUrl) {
      this.fullUrl = `${global.domain}${this.url}`;
    }
    return hash ? `${this.fullUrl}#${hash}` : this.fullUrl;
  }
}
