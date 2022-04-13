export enum FeedTypes {
  all = 'all',
  integration = 'integration',
  connector = 'connector',
}

export interface IFeedOptions {
  singular: string;
  capitalSingular: string;
  plural: string;
  capitalPlural: string;
  feedKey: FeedTypes;
}
