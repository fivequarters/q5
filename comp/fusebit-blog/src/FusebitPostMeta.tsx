// --------------
// Exported Types
// --------------

export enum FusebitAuthor {
  tomek = 'tomek',
  yavor = 'yavor',
  randall = 'randall',
}

export type FusebitPostMeta = {
  postId: string;
  title: string;
  subtitle?: string;
  author?: FusebitAuthor;
  year: number;
  month: number;
  day: number;
  summary?: string;
  imageSrc?: string;
  shareText?: string;
  twitterShareText?: string;
  linkedInShareText?: string;
};
